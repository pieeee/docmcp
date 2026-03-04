import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { bm25Search } from '../../../src/storage/search.js'

describe('bm25Search', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')

    // Create schema
    db.exec(`
      CREATE TABLE docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE
      );

      CREATE TABLE chunks (
        id TEXT PRIMARY KEY,
        doc_id INTEGER NOT NULL REFERENCES docs(id),
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        heading TEXT,
        breadcrumb TEXT,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL
      );

      CREATE VIRTUAL TABLE chunks_fts USING fts5(
        content,
        breadcrumb,
        content='chunks',
        content_rowid='rowid'
      );

      CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunks_fts(rowid, content, breadcrumb)
        VALUES (new.rowid, new.content, new.breadcrumb);
      END;
    `)

    // Insert test data
    db.prepare('INSERT INTO docs (name, url) VALUES (?, ?)').run('TestDoc', 'https://example.com')

    const insertChunk = db.prepare(`
      INSERT INTO chunks (id, doc_id, url, title, heading, breadcrumb, content, token_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertChunk.run('chunk1', 1, 'https://example.com/page1', 'Page 1', 'Introduction',
      'TestDoc > Introduction', 'This is an introduction to the documentation.', 10)

    insertChunk.run('chunk2', 1, 'https://example.com/page2', 'Page 2', 'Getting Started',
      'TestDoc > Getting Started', 'Getting started guide with installation instructions.', 12)

    insertChunk.run('chunk3', 1, 'https://example.com/page3', 'Page 3', 'API Reference',
      'TestDoc > API Reference', 'The API provides methods for flexbox and grid layouts.', 15)
  })

  afterEach(() => {
    db.close()
  })

  it('should find results matching query', () => {
    const results = bm25Search(db, 'introduction', { limit: 10 })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.content).toContain('introduction')
  })

  it('should return empty array for no matches', () => {
    const results = bm25Search(db, 'nonexistentterm123456', { limit: 10 })

    expect(results).toEqual([])
  })

  it('should respect limit option', () => {
    const results = bm25Search(db, 'the', { limit: 1 })

    expect(results.length).toBeLessThanOrEqual(1)
  })

  it('should filter by doc name', () => {
    // Add another doc
    db.prepare('INSERT INTO docs (name, url) VALUES (?, ?)').run('OtherDoc', 'https://other.com')
    db.prepare(`
      INSERT INTO chunks (id, doc_id, url, title, heading, breadcrumb, content, token_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('chunk4', 2, 'https://other.com/page', 'Other Page', 'Other',
      'OtherDoc > Other', 'This is other documentation content.', 8)

    const results = bm25Search(db, 'documentation', { docFilter: 'TestDoc', limit: 10 })

    expect(results.every(r => r.docName === 'TestDoc')).toBe(true)
  })

  it('should escape FTS5 special characters', () => {
    // These shouldn't throw
    expect(() => bm25Search(db, 'flex-wrap', { limit: 10 })).not.toThrow()
    expect(() => bm25Search(db, 'function()', { limit: 10 })).not.toThrow()
    expect(() => bm25Search(db, 'class:method', { limit: 10 })).not.toThrow()
    expect(() => bm25Search(db, '"quoted"', { limit: 10 })).not.toThrow()
    expect(() => bm25Search(db, 'a * b', { limit: 10 })).not.toThrow()
  })

  it('should handle empty query', () => {
    const results = bm25Search(db, '', { limit: 10 })

    expect(results).toEqual([])
  })

  it('should handle whitespace-only query', () => {
    const results = bm25Search(db, '   ', { limit: 10 })

    expect(results).toEqual([])
  })

  it('should return results with all expected fields', () => {
    const results = bm25Search(db, 'introduction', { limit: 10 })

    expect(results.length).toBeGreaterThan(0)
    const result = results[0]!

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('heading')
    expect(result).toHaveProperty('breadcrumb')
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('docName')
  })

  it('should return positive scores', () => {
    const results = bm25Search(db, 'introduction', { limit: 10 })

    expect(results.length).toBeGreaterThan(0)
    // BM25 scores are converted to positive in the function
    expect(results[0]!.score).toBeGreaterThan(0)
  })

  it('should handle multiple search terms', () => {
    const results = bm25Search(db, 'getting started guide', { limit: 10 })

    expect(results.length).toBeGreaterThan(0)
  })

  it('should be case insensitive', () => {
    const results1 = bm25Search(db, 'INTRODUCTION', { limit: 10 })
    const results2 = bm25Search(db, 'introduction', { limit: 10 })

    expect(results1.length).toBe(results2.length)
  })
})
