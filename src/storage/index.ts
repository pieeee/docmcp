import type Database from 'better-sqlite3'
import type { DocMeta, StoredChunk } from './types.js'
import { isVectorSupported } from './db.js'

export interface ChunkInput {
  id: string
  url: string
  title: string
  heading: string | null
  breadcrumb: string | null
  content: string
  tokenCount: number
}

export interface DocInput {
  name: string
  url: string
  provider: string
  dimensions: number | null
}

export function storeDoc(db: Database.Database, doc: DocInput): number {
  const now = new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO docs (name, url, provider, dimensions, page_count, chunk_count, crawled_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 0, ?, ?)
  `)
  const result = stmt.run(doc.name, doc.url, doc.provider, doc.dimensions, now, now)
  return Number(result.lastInsertRowid)
}

export function updateDocCounts(
  db: Database.Database,
  docId: number,
  pageCount: number,
  chunkCount: number
): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE docs SET page_count = ?, chunk_count = ?, updated_at = ?
    WHERE id = ?
  `).run(pageCount, chunkCount, now, docId)
}

export function storeChunk(db: Database.Database, chunk: ChunkInput, docId: number): number {
  const now = new Date().toISOString()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO chunks
      (id, doc_id, url, title, heading, breadcrumb, content, token_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    chunk.id,
    docId,
    chunk.url,
    chunk.title,
    chunk.heading,
    chunk.breadcrumb,
    chunk.content,
    chunk.tokenCount,
    now
  )

  const result = db.prepare(
    'SELECT rowid FROM chunks WHERE id = ?'
  ).get(chunk.id) as { rowid: number | bigint }
  // Convert to Number in case better-sqlite3 returns BigInt
  return Number(result.rowid)
}

export function storeVector(db: Database.Database, chunkRowid: number, vector: Float32Array): void {
  if (!isVectorSupported()) return

  // sqlite-vec needs embedding as buffer
  const vectorBuffer = Buffer.from(new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength))

  // Insert into vec0 table and get the rowid
  const result = db.prepare(
    'INSERT INTO chunk_vectors (embedding) VALUES (?)'
  ).run(vectorBuffer)

  // Store the mapping between vec rowid and chunk rowid
  db.prepare(
    'INSERT INTO chunk_vector_map (vec_rowid, chunk_rowid) VALUES (?, ?)'
  ).run(result.lastInsertRowid, chunkRowid)
}

export function getDoc(db: Database.Database, id: number): DocMeta | null {
  const row = db.prepare(`
    SELECT id, name, url, page_count, chunk_count, provider, dimensions, crawled_at, updated_at
    FROM docs WHERE id = ?
  `).get(id) as {
    id: number
    name: string
    url: string
    page_count: number
    chunk_count: number
    provider: string
    dimensions: number | null
    crawled_at: string
    updated_at: string
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    provider: row.provider,
    dimensions: row.dimensions,
    crawledAt: row.crawled_at,
    updatedAt: row.updated_at,
  }
}

export function getDocByUrl(db: Database.Database, url: string): DocMeta | null {
  const row = db.prepare(`
    SELECT id, name, url, page_count, chunk_count, provider, dimensions, crawled_at, updated_at
    FROM docs WHERE url = ?
  `).get(url) as {
    id: number
    name: string
    url: string
    page_count: number
    chunk_count: number
    provider: string
    dimensions: number | null
    crawled_at: string
    updated_at: string
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    provider: row.provider,
    dimensions: row.dimensions,
    crawledAt: row.crawled_at,
    updatedAt: row.updated_at,
  }
}

export function getDocByName(db: Database.Database, name: string): DocMeta | null {
  const row = db.prepare(`
    SELECT id, name, url, page_count, chunk_count, provider, dimensions, crawled_at, updated_at
    FROM docs WHERE name = ? COLLATE NOCASE
  `).get(name) as {
    id: number
    name: string
    url: string
    page_count: number
    chunk_count: number
    provider: string
    dimensions: number | null
    crawled_at: string
    updated_at: string
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    provider: row.provider,
    dimensions: row.dimensions,
    crawledAt: row.crawled_at,
    updatedAt: row.updated_at,
  }
}

export function listDocs(db: Database.Database): DocMeta[] {
  const rows = db.prepare(`
    SELECT id, name, url, page_count, chunk_count, provider, dimensions, crawled_at, updated_at
    FROM docs ORDER BY updated_at DESC
  `).all() as Array<{
    id: number
    name: string
    url: string
    page_count: number
    chunk_count: number
    provider: string
    dimensions: number | null
    crawled_at: string
    updated_at: string
  }>

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    url: row.url,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    provider: row.provider,
    dimensions: row.dimensions,
    crawledAt: row.crawled_at,
    updatedAt: row.updated_at,
  }))
}

export function deleteDoc(db: Database.Database, id: number): void {
  // Chunks are deleted via CASCADE
  // But we need to manually delete vectors and mappings if supported
  if (isVectorSupported()) {
    // First delete from chunk_vectors using the mapping
    db.prepare(`
      DELETE FROM chunk_vectors
      WHERE rowid IN (
        SELECT m.vec_rowid FROM chunk_vector_map m
        JOIN chunks c ON m.chunk_rowid = c.rowid
        WHERE c.doc_id = ?
      )
    `).run(id)

    // Then delete the mappings
    db.prepare(`
      DELETE FROM chunk_vector_map
      WHERE chunk_rowid IN (SELECT rowid FROM chunks WHERE doc_id = ?)
    `).run(id)
  }

  db.prepare('DELETE FROM docs WHERE id = ?').run(id)
}

export function getChunk(db: Database.Database, id: string): StoredChunk | null {
  const row = db.prepare(`
    SELECT id, doc_id, url, title, heading, breadcrumb, content, token_count, created_at
    FROM chunks WHERE id = ?
  `).get(id) as {
    id: string
    doc_id: number
    url: string
    title: string
    heading: string | null
    breadcrumb: string | null
    content: string
    token_count: number
    created_at: string
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    docId: row.doc_id,
    url: row.url,
    title: row.title,
    heading: row.heading,
    breadcrumb: row.breadcrumb,
    content: row.content,
    tokenCount: row.token_count,
    createdAt: row.created_at,
  }
}

export { openDB, closeDB, getDB, ensureVectorTable, getStoredDimensions, setStoredDimensions, isVectorSupported } from './db.js'
export type { DocMeta, StoredChunk, SearchResult, SearchOptions } from './types.js'
