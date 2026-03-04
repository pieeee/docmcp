import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type Database from 'better-sqlite3'
import { loadConfig } from '../config/index.js'
import { openDB } from '../storage/index.js'
import { newProvider } from '../embedder/index.js'
import { registerSearchDocs } from './tools/search_docs.js'
import { registerListDocs } from './tools/list_docs.js'

export async function startMCPServer(): Promise<void> {
  let db: Database.Database | null = null
  let isShuttingDown = false

  // Graceful shutdown handler (idempotent)
  function gracefulShutdown() {
    if (isShuttingDown) return
    isShuttingDown = true

    try {
      if (db) {
        db.close()
        db = null
      }
    } catch {
      // Ignore close errors during shutdown
    }
    process.exit(0)
  }

  try {
    // Load configuration
    const config = await loadConfig()

    // Open database
    db = openDB(config.dbPath)

    // Initialize embedding provider
    const embedder = await newProvider(config)

    // Create MCP server
    const server = new McpServer({
      name: 'docmcp',
      version: '0.1.0',
    })

    // Register tools
    registerSearchDocs(server, db, embedder)
    registerListDocs(server, db)

    // Create stdio transport and connect
    const transport = new StdioServerTransport()
    await server.connect(transport)

    // Handle shutdown signals
    // SIGINT works on all platforms (Ctrl+C)
    process.on('SIGINT', gracefulShutdown)

    // SIGTERM only exists on Unix-like systems
    if (process.platform !== 'win32') {
      process.on('SIGTERM', gracefulShutdown)
    }

    // Ensure cleanup on process exit
    process.on('exit', () => {
      if (!isShuttingDown && db) {
        try {
          db.close()
        } catch {
          // Ignore
        }
      }
    })
  } catch (error) {
    // Log to stderr (MCP protocol uses stdout)
    const message = error instanceof Error ? error.message : String(error)
    console.error(`DocMCP server failed to start: ${message}`)

    // Clean up if db was opened
    if (db) {
      try {
        db.close()
      } catch {
        // Ignore
      }
    }

    process.exit(1)
  }
}
