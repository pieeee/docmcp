import { homedir } from 'os'
import { join } from 'path'
import type { Config } from './config.js'

export function getDefaultDataDir(): string {
  return process.env.DOCMCP_DATA_DIR ?? join(homedir(), '.docmcp')
}

export function getDefaultDbPath(dataDir: string): string {
  return process.env.DOCMCP_DB_PATH ?? join(dataDir, 'db', 'docs.db')
}

export function defaultConfig(): Config {
  const dataDir = getDefaultDataDir()

  return {
    version: 1,
    dataDir,
    dbPath: getDefaultDbPath(dataDir),

    embedding: {
      provider: 'bm25only',
      dimensions: null,
    },

    crawler: {
      defaultDelay: 200,
      defaultConcurrency: 3,
      defaultMaxDepth: 10,
      userAgent: 'docmcp/0.1.0 (documentation indexer)',
    },

    search: {
      defaultLimit: 5,
      rrfK: 60,
    },
  }
}
