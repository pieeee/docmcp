import * as cheerio from 'cheerio'

// Maximum HTML size to process (5MB) - prevents DoS from malicious/broken sites
const MAX_HTML_SIZE = 5 * 1024 * 1024

// Selectors to REMOVE before parsing
const NOISE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '.sidebar',
  '.toc',
  '.table-of-contents',
  '.nav',
  '.cookie-banner',
  '.announcement',
  '.ad',
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  // Common doc-site specific noise
  '.DocSearch',
  '.navbar',
  '.menu',
  '.breadcrumb',
  '[aria-label="breadcrumb"]',
  '.feedback',
  '.edit-page',
  '.page-nav',
  '.pagination',
  '.prev-next',
  // Social/share buttons
  '.share',
  '.social',
  // Version selectors
  '.version-selector',
  '.docsearch',
]

// Main content selectors in order of preference
const MAIN_CONTENT_SELECTORS = [
  'main',
  '[role="main"]',
  'article',
  '.content',
  '.docs-content',
  '.markdown-body',
  '.prose',
  '#content',
  '#main',
  '.main-content',
  '.doc-content',
  '.article-content',
]

export function cleanHTML(html: string): string {
  // Prevent DoS from oversized HTML
  if (html.length > MAX_HTML_SIZE) {
    throw new Error(`HTML content exceeds maximum size of ${MAX_HTML_SIZE / 1024 / 1024}MB`)
  }

  const $ = cheerio.load(html)

  // Remove noise elements
  for (const sel of NOISE_SELECTORS) {
    $(sel).remove()
  }

  // Try to isolate main content
  for (const sel of MAIN_CONTENT_SELECTORS) {
    const main = $(sel)
    if (main.length > 0) {
      return main.first().html() ?? $.html()
    }
  }

  // Fallback: return body content
  const body = $('body')
  if (body.length > 0) {
    return body.html() ?? $.html()
  }

  return $.html()
}

export function extractTitle(html: string): string {
  const $ = cheerio.load(html)

  // Try meta title first
  const metaTitle = $('meta[property="og:title"]').attr('content')
  if (metaTitle) return metaTitle.trim()

  // Try page title
  const title = $('title').text()
  if (title) {
    // Remove common suffixes like "| Docs" or "- Documentation"
    return title
      .replace(/\s*[|–-]\s*[^|–-]+$/, '')
      .trim()
  }

  // Try h1
  const h1 = $('h1').first().text()
  if (h1) return h1.trim()

  return 'Untitled'
}
