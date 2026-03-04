export interface DocMeta {
  id: number
  name: string
  url: string
  pageCount: number
  chunkCount: number
  provider: string
  dimensions: number | null
  crawledAt: string
  updatedAt: string
}

export interface StoredChunk {
  id: string
  docId: number
  url: string
  title: string
  heading: string | null
  breadcrumb: string | null
  content: string
  tokenCount: number
  createdAt: string
}

export interface SearchResult {
  id: string
  url: string
  title: string
  heading: string | null
  breadcrumb: string | null
  content: string
  score: number
  docName?: string
}

export interface SearchOptions {
  docFilter?: string
  limit?: number
}
