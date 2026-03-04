import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type Database from 'better-sqlite3'
import { listDocs } from '../../storage/index.js'
import { formatDocList } from '../formatter.js'

export function registerListDocs(server: McpServer, db: Database.Database): void {
  server.tool(
    'list_docs',
    'List all documentation sources that have been indexed. ' +
      'Use this to see what docs are available before searching.',
    {},
    async () => {
      try {
        const docs = listDocs(db)

        return {
          content: [
            {
              type: 'text',
              text: formatDocList(docs),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing docs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
