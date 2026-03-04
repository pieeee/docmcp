export interface Chunk {
  id: string
  url: string
  title: string
  heading: string | null
  breadcrumb: string
  content: string
  tokenCount: number
}

export interface ParsedPage {
  url: string
  title: string
  markdown: string
}
