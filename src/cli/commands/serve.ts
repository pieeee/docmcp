import { isFirstRun } from '../../config/index.js'

export async function serveCommand(): Promise<void> {
  // Check if initialized - write to stderr to not interfere with MCP protocol
  if (await isFirstRun()) {
    console.error('DocMCP is not initialized. Run `docmcp init` first.')
    process.exit(1)
  }

  // MCP uses stdio, so don't write anything to stdout
  // Log to stderr for debugging if needed
  console.error('DocMCP MCP server starting...')

  // Dynamically import and start the MCP server
  const { startMCPServer } = await import('../../mcp/server.js')
  await startMCPServer()
}
