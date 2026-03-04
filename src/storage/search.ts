import type Database from 'better-sqlite3'
import type { SearchResult, SearchOptions } from './types.js'
import { isVectorSupported } from './db.js'

const RRF_K = 60 // Standard RRF constant

interface RawSearchResult {
  id: string
  url: string
  title: string
  heading: string | null
  breadcrumb: string | null
  content: string
  score: number
  doc_name: string
}

function escapeFts5Query(query: string): string {
  // Escape special FTS5 characters and wrap terms in quotes
  // Remove characters that could break FTS5 syntax
  return query
    .replace(/[*"(){}[\]^~\\:]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 0)
    .map(term => `"${term}"`)
    .join(' OR ')
}

export function bm25Search(
  db: Database.Database,
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const { docFilter, limit = 20 } = options
  const ftsQuery = escapeFts5Query(query)

  if (!ftsQuery) {
    return []
  }

  let sql = `
    SELECT
      c.id, c.url, c.title, c.heading, c.breadcrumb, c.content,
      bm25(chunks_fts) as score,
      d.name as doc_name
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.rowid
    JOIN docs d ON c.doc_id = d.id
    WHERE chunks_fts MATCH ?
  `

  const params: (string | number)[] = [ftsQuery]

  if (docFilter) {
    sql += ` AND d.name = ? COLLATE NOCASE`
    params.push(docFilter)
  }

  sql += ` ORDER BY score LIMIT ?`
  params.push(limit)

  const stmt = db.prepare(sql)
  const rows = stmt.all(...params) as RawSearchResult[]

  return rows.map(row => ({
    id: row.id,
    url: row.url,
    title: row.title,
    heading: row.heading,
    breadcrumb: row.breadcrumb,
    content: row.content,
    score: Math.abs(row.score), // BM25 returns negative scores
    docName: row.doc_name,
  }))
}

export function vectorSearch(
  db: Database.Database,
  queryVector: Float32Array,
  options: SearchOptions = {}
): SearchResult[] {
  if (!isVectorSupported()) {
    return []
  }

  const { docFilter, limit = 20 } = options

  // sqlite-vec uses KNN syntax with MATCH and k parameter
  // Use mapping table to link vec rowid to chunk rowid
  let sql = `
    SELECT
      c.id, c.url, c.title, c.heading, c.breadcrumb, c.content,
      v.distance as score,
      d.name as doc_name
    FROM chunk_vectors v
    JOIN chunk_vector_map m ON v.rowid = m.vec_rowid
    JOIN chunks c ON m.chunk_rowid = c.rowid
    JOIN docs d ON c.doc_id = d.id
    WHERE v.embedding MATCH ?
      AND k = ?
  `

  // Convert query vector to Buffer for sqlite-vec
  const queryBuffer = Buffer.from(
    new Uint8Array(queryVector.buffer, queryVector.byteOffset, queryVector.byteLength)
  )
  const params: (Buffer | string | number)[] = [queryBuffer, limit]

  if (docFilter) {
    sql += ` AND d.name = ? COLLATE NOCASE`
    params.push(docFilter)
  }

  sql += ` ORDER BY v.distance`

  try {
    const stmt = db.prepare(sql)
    const rows = stmt.all(...params) as RawSearchResult[]

    return rows.map(row => ({
      id: row.id,
      url: row.url,
      title: row.title,
      heading: row.heading,
      breadcrumb: row.breadcrumb,
      content: row.content,
      score: 1 - row.score, // Convert distance to similarity (lower distance = higher score)
      docName: row.doc_name,
    }))
  } catch {
    // Vector search failed, return empty
    return []
  }
}

export function hybridSearch(
  db: Database.Database,
  query: string,
  queryVector: Float32Array | null,
  options: SearchOptions = {}
): SearchResult[] {
  const { limit = 5 } = options

  // Get BM25 results
  const bm25Results = bm25Search(db, query, { ...options, limit: 20 })

  // If no vector or vector search not supported, return BM25 only
  if (!queryVector || !isVectorSupported()) {
    return bm25Results.slice(0, limit)
  }

  // Get vector results
  const vectorResults = vectorSearch(db, queryVector, { ...options, limit: 20 })

  // If vector search returned nothing, fall back to BM25
  if (vectorResults.length === 0) {
    return bm25Results.slice(0, limit)
  }

  // Build rank maps (1-indexed ranks)
  const bm25Ranks = new Map<string, number>()
  bm25Results.forEach((r, i) => bm25Ranks.set(r.id, i + 1))

  const vectorRanks = new Map<string, number>()
  vectorResults.forEach((r, i) => vectorRanks.set(r.id, i + 1))

  // Collect all unique chunk IDs
  const allIds = new Set([...bm25Ranks.keys(), ...vectorRanks.keys()])

  // Build a map from ID to result data
  const resultMap = new Map<string, SearchResult>()
  for (const r of bm25Results) {
    resultMap.set(r.id, r)
  }
  for (const r of vectorResults) {
    if (!resultMap.has(r.id)) {
      resultMap.set(r.id, r)
    }
  }

  // Score with RRF
  const scored: SearchResult[] = []
  for (const id of allIds) {
    const bm25Rank = bm25Ranks.get(id) ?? 1000 // Large rank if not found
    const vectorRank = vectorRanks.get(id) ?? 1000
    const rrfScore = 1 / (RRF_K + bm25Rank) + 1 / (RRF_K + vectorRank)

    const chunk = resultMap.get(id)
    if (chunk) {
      scored.push({ ...chunk, score: rrfScore })
    }
  }

  // Sort by RRF score (higher is better) and take top results
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
