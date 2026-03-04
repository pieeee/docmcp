import { CheerioCrawler, Configuration } from 'crawlee'
import type {
  CrawlOptions,
  CrawledPage,
  OnPageCallback,
  OnProgressCallback,
} from './types.js'
import { fetchSitemap } from './sitemap.js'

const DEFAULT_OPTIONS: Required<CrawlOptions> = {
  maxDepth: 10,
  maxPages: Infinity,
  include: [],
  exclude: [],
  delayMs: 200,
  concurrency: 3,
  useSitemap: true,
}

export async function crawl(
  baseUrl: string,
  options: CrawlOptions = {},
  onPage: OnPageCallback,
  onProgress?: OnProgressCallback
): Promise<{ total: number; failed: number }> {
  const opts: Required<CrawlOptions> = {
    maxDepth: options.maxDepth ?? DEFAULT_OPTIONS.maxDepth,
    maxPages: options.maxPages ?? DEFAULT_OPTIONS.maxPages,
    include: options.include ?? DEFAULT_OPTIONS.include,
    exclude: options.exclude ?? DEFAULT_OPTIONS.exclude,
    delayMs: options.delayMs ?? DEFAULT_OPTIONS.delayMs,
    concurrency: options.concurrency ?? DEFAULT_OPTIONS.concurrency,
    useSitemap: options.useSitemap ?? DEFAULT_OPTIONS.useSitemap,
  }
  const base = new URL(baseUrl)

  let crawled = 0
  let failed = 0
  let totalExpected = 0
  const visitedUrls = new Set<string>()

  // Try sitemap first
  let initialUrls: string[] = []
  if (opts.useSitemap) {
    try {
      initialUrls = await fetchSitemap(baseUrl)
      if (initialUrls.length > 0) {
        totalExpected = Math.min(initialUrls.length, opts.maxPages)
      }
    } catch {
      // Sitemap failed, fall back to recursive crawl
    }
  }

  // If no sitemap URLs, start with base URL
  if (initialUrls.length === 0) {
    initialUrls = [baseUrl]
    totalExpected = opts.maxPages === Infinity ? 100 : opts.maxPages // Estimate
  }

  // Apply include/exclude filters to initial URLs
  initialUrls = initialUrls.filter((url) => matchesFilters(url, opts.include, opts.exclude))

  // Limit to maxPages
  if (initialUrls.length > opts.maxPages) {
    initialUrls = initialUrls.slice(0, opts.maxPages)
  }

  // Configure crawlee to not use persistent storage
  const config = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
  })

  const crawler = new CheerioCrawler(
    {
      maxConcurrency: opts.concurrency,
      maxRequestsPerMinute: Math.floor(60000 / opts.delayMs),
      maxRequestRetries: 2,

      async requestHandler({ request, $, response }) {
        const url = request.loadedUrl ?? request.url

        // Skip if already visited
        if (visitedUrls.has(url)) return
        visitedUrls.add(url)

        // Skip if we've hit max pages
        if (crawled >= opts.maxPages) return

        // Skip if URL doesn't match filters
        if (!matchesFilters(url, opts.include, opts.exclude)) return

        const html = $.html()
        const title = $('title').text() || 'Untitled'
        const statusCode = response?.statusCode ?? 200

        const page: CrawledPage = {
          url,
          html,
          title,
          statusCode,
        }

        try {
          await onPage(page)
          crawled++
        } catch (err) {
          failed++
          console.error(`Error processing ${url}:`, err)
        }

        onProgress?.({
          crawled,
          total: totalExpected,
          currentUrl: url,
          failed,
        })

        // If we're doing recursive crawl (no sitemap), enqueue links
        if (initialUrls.length === 1) {
          const links = $('a[href]')
            .map((_, el) => $(el).attr('href'))
            .get()
            .filter((href): href is string => !!href)
            .map((href) => {
              try {
                return new URL(href, url).href
              } catch {
                return null
              }
            })
            .filter((href): href is string => {
              if (!href) return false
              try {
                const parsed = new URL(href)
                // Only crawl same origin
                return parsed.origin === base.origin
              } catch {
                return false
              }
            })
            .filter((href) => !visitedUrls.has(href))
            .filter((href) => matchesFilters(href, opts.include, opts.exclude))

          // Add to queue (crawlee handles deduplication)
          for (const link of links.slice(0, 50)) {
            // Limit links per page
            const queueCount = crawler.requestQueue?.assumedHandledCount ?? 0
            if (crawled + queueCount < opts.maxPages) {
              await crawler.addRequests([{ url: link }])
            }
          }
        }
      },

      failedRequestHandler({ request, error }) {
        failed++
        console.error(`Failed to crawl ${request.url}:`, error)
        onProgress?.({
          crawled,
          total: totalExpected,
          currentUrl: request.url,
          failed,
        })
      },
    },
    config
  )

  // Add initial URLs to the queue
  await crawler.addRequests(initialUrls.map((url) => ({ url })))

  // Run the crawler
  await crawler.run()

  return { total: crawled, failed }
}

function matchesFilters(
  url: string,
  include: string[],
  exclude: string[]
): boolean {
  // If include patterns specified, URL must match at least one
  if (include.length > 0) {
    const matches = include.some((pattern) => matchGlob(url, pattern))
    if (!matches) return false
  }

  // URL must not match any exclude pattern
  if (exclude.length > 0) {
    const excluded = exclude.some((pattern) => matchGlob(url, pattern))
    if (excluded) return false
  }

  return true
}

function matchGlob(url: string, pattern: string): boolean {
  // Simple glob matching: * matches anything except /
  // ** matches anything including /
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '.*') // ** -> .*
    .replace(/\*/g, '[^/]*') // * -> [^/]*

  return new RegExp(`^${regex}$`).test(url)
}

export function extractDocName(url: string): string {
  try {
    const parsed = new URL(url)
    // Use hostname without www
    let name = parsed.hostname.replace(/^www\./, '')

    // If it's a subdomain like docs.example.com, use that
    const parts = name.split('.')
    if (parts.length > 2 && parts[0] !== 'www') {
      // Use first part + domain (e.g., "docs.example")
      name = `${parts[0]}.${parts[parts.length - 2]}`
    } else if (parts.length >= 2) {
      // Use domain without TLD
      name = parts[parts.length - 2] ?? name
    }

    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return 'Documentation'
  }
}
