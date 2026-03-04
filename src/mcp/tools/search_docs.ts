import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import type { EmbeddingProvider } from '../../embedder/index.js'
import { hybridSearch } from '../../storage/search.js'
import { formatSearchResults } from '../formatter.js'

export function registerSearchDocs(
  server: McpServer,
  db: Database.Database,
  embedder: EmbeddingProvider
): void {
  server.tool(
    'search_docs',
    'Search indexed documentation using semantic + keyword search. ' +
      'Returns the most relevant chunks from any indexed documentation site. ' +
      'Use this when you need current docs for a library, framework, or tool.',
    {
      query: z.string().describe('What you want to find in the docs'),
      doc: z
        .string()
        .optional()
        .describe(
          'Filter to a specific doc by name (e.g. "TailwindCSS"). ' +
            'Leave empty to search all indexed docs.'
        ),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe('Number of results (default 5, max 10)'),
    },
    async ({ query, doc, limit }) => {
      try {
        // Get query embedding if provider supports it
        let queryVector: Float32Array | null = null
        if (embedder.dimensions) {
          queryVector = await embedder.embed(query, 'query')
        }

        // Perform hybrid search
        const results = hybridSearch(db, query, queryVector, {
          docFilter: doc,
          limit: Math.min(limit ?? 5, 10),
        })

        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(results, query),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching docs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
