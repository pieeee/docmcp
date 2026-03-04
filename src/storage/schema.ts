export const SCHEMA_VERSION = 1

export const CREATE_DOCS_TABLE = `
CREATE TABLE IF NOT EXISTS docs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL UNIQUE,
  page_count  INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  provider    TEXT NOT NULL,
  dimensions  INTEGER,
  crawled_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
)`

export const CREATE_CHUNKS_TABLE = `
CREATE TABLE IF NOT EXISTS chunks (
  id          TEXT PRIMARY KEY,
  doc_id      INTEGER NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL,
  heading     TEXT,
  breadcrumb  TEXT,
  content     TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at  TEXT NOT NULL
)`

export const CREATE_CHUNKS_FTS = `
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  content,
  breadcrumb,
  content='chunks',
  content_rowid='rowid'
)`

export const CREATE_FTS_TRIGGER_INSERT = `
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, content, breadcrumb)
  VALUES (new.rowid, new.content, new.breadcrumb);
END`

export const CREATE_FTS_TRIGGER_DELETE = `
CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, content, breadcrumb)
  VALUES ('delete', old.rowid, old.content, old.breadcrumb);
END`

export const CREATE_FTS_TRIGGER_UPDATE = `
CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, content, breadcrumb)
  VALUES ('delete', old.rowid, old.content, old.breadcrumb);
  INSERT INTO chunks_fts(rowid, content, breadcrumb)
  VALUES (new.rowid, new.content, new.breadcrumb);
END`

export function createVectorTable(dimensions: number): string {
  // vec0 doesn't support custom rowid, so we use a mapping table
  return `
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vectors USING vec0(
  embedding float[${dimensions}]
);

CREATE TABLE IF NOT EXISTS chunk_vector_map (
  vec_rowid INTEGER PRIMARY KEY,
  chunk_rowid INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunk_vector_map_chunk
  ON chunk_vector_map(chunk_rowid);
`
}

export const CREATE_META_TABLE = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`

export const ALL_MIGRATIONS = [
  CREATE_DOCS_TABLE,
  CREATE_CHUNKS_TABLE,
  CREATE_CHUNKS_FTS,
  CREATE_FTS_TRIGGER_INSERT,
  CREATE_FTS_TRIGGER_DELETE,
  CREATE_FTS_TRIGGER_UPDATE,
  CREATE_META_TABLE,
]
