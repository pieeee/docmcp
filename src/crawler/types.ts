export interface CrawlOptions {
  maxDepth?: number
  maxPages?: number
  include?: string[]
  exclude?: string[]
  delayMs?: number
  concurrency?: number
  useSitemap?: boolean
}

export interface CrawledPage {
  url: string
  html: string
  title: string
  statusCode: number
  contentType?: 'html' | 'openapi' | 'json'
}

export interface CrawlResult {
  total: number
  failed: number
  pages: CrawledPage[]
}

export interface CrawlProgress {
  crawled: number
  total: number
  currentUrl: string
  failed: number
}

export type OnPageCallback = (page: CrawledPage) => Promise<void>
export type OnProgressCallback = (progress: CrawlProgress) => void
