import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

interface SitemapUrl {
  loc: string
  lastmod?: string
  priority?: string
}

interface SitemapIndex {
  sitemapindex?: {
    sitemap: Array<{ loc: string }> | { loc: string }
  }
}

interface UrlSet {
  urlset?: {
    url: Array<SitemapUrl> | SitemapUrl
  }
}

export async function fetchSitemap(baseUrl: string): Promise<string[]> {
  // Normalize base URL
  const base = new URL(baseUrl)
  const origin = base.origin

  // Candidate sitemap locations
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap.xml.gz`,
  ]

  // Also check robots.txt for Sitemap directive
  const robotsSitemap = await extractSitemapFromRobots(origin)
  if (robotsSitemap) {
    candidates.unshift(robotsSitemap)
  }

  for (const url of candidates) {
    try {
      const urls = await tryParseSitemap(url)
      if (urls.length > 0) {
        // Filter URLs to only include those under the base path
        const basePath = base.pathname.replace(/\/$/, '')
        return urls.filter((u) => {
          try {
            const parsed = new URL(u)
            return (
              parsed.origin === origin &&
              (basePath === '' || parsed.pathname.startsWith(basePath))
            )
          } catch {
            return false
          }
        })
      }
    } catch {
      // Try next candidate
    }
  }

  return []
}

async function extractSitemapFromRobots(origin: string): Promise<string | null> {
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': 'docmcp/0.1.0' },
    })
    if (!response.ok) return null

    const text = await response.text()
    const match = text.match(/^Sitemap:\s*(.+)$/im)
    return match?.[1]?.trim() ?? null
  } catch {
    return null
  }
}

async function tryParseSitemap(url: string): Promise<string[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'docmcp/0.1.0' },
  })

  if (!response.ok) {
    return []
  }

  const text = await response.text()

  // Handle gzipped sitemaps
  if (url.endsWith('.gz')) {
    // Bun handles decompression automatically for gzipped responses
    // If not, we'd need to decompress manually
  }

  const parsed = parser.parse(text) as SitemapIndex & UrlSet

  // Check if it's a sitemap index
  if (parsed.sitemapindex) {
    const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap]

    const allUrls: string[] = []
    for (const sitemap of sitemaps) {
      if (sitemap?.loc) {
        const childUrls = await tryParseSitemap(sitemap.loc)
        allUrls.push(...childUrls)
      }
    }
    return allUrls
  }

  // Regular sitemap
  if (parsed.urlset?.url) {
    const urls = Array.isArray(parsed.urlset.url)
      ? parsed.urlset.url
      : [parsed.urlset.url]

    return urls
      .filter((u): u is SitemapUrl => !!u?.loc)
      .map((u) => u.loc)
  }

  return []
}
