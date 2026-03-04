import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import {
  ALL_MIGRATIONS,
  SCHEMA_VERSION,
  createVectorTable,
} from './schema.js'

let db: Database.Database | null = null
let vectorSupported = false

export function openDB(path: string): Database.Database {
  if (db) return db

  db = new Database(path)

  // Try to load sqlite-vec extension for vector search
  try {
    sqliteVec.load(db)
    vectorSupported = true
  } catch (_err) {
    console.warn('Warning: sqlite-vec extension could not be loaded. Vector search disabled.')
    console.warn('BM25 keyword search will still work.')
    vectorSupported = false
  }

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  return db
}

export function getDB(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call openDB() first.')
  }
  return db
}

export function closeDB(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function isVectorSupported(): boolean {
  return vectorSupported
}

function runMigrations(database: Database.Database): void {
  // Check current schema version
  const versionResult = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='meta'"
  ).get()

  let currentVersion = 0
  if (versionResult) {
    const row = database.prepare(
      "SELECT value FROM meta WHERE key = 'schema_version'"
    ).get() as { value: string } | null
    if (row) {
      currentVersion = parseInt(row.value, 10)
    }
  }

  if (currentVersion < SCHEMA_VERSION) {
    // Run all migrations
    for (const sql of ALL_MIGRATIONS) {
      database.exec(sql)
    }

    // Update or insert schema version
    database.prepare(`
      INSERT OR REPLACE INTO meta (key, value)
      VALUES ('schema_version', ?)
    `).run(SCHEMA_VERSION.toString())
  }
}

export function ensureVectorTable(database: Database.Database, dimensions: number): void {
  if (!vectorSupported) return

  // Check if vector table exists
  const exists = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='chunk_vectors'"
  ).get()

  if (!exists) {
    database.exec(createVectorTable(dimensions))
  }
}

export function getStoredDimensions(database: Database.Database): number | null {
  const row = database.prepare(
    "SELECT value FROM meta WHERE key = 'vector_dimensions'"
  ).get() as { value: string } | null

  return row ? parseInt(row.value, 10) : null
}

export function setStoredDimensions(database: Database.Database, dimensions: number): void {
  database.prepare(`
    INSERT OR REPLACE INTO meta (key, value)
    VALUES ('vector_dimensions', ?)
  `).run(dimensions.toString())
}
