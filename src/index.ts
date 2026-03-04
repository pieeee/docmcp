#!/usr/bin/env node

const args = process.argv.slice(2)

// If invoked as MCP server (via --mcp flag), start MCP server mode
// Otherwise, start CLI mode
if (args.includes('--mcp')) {
  // MCP server mode — communicate via stdio
  const { startMCPServer } = await import('./mcp/server.js')
  await startMCPServer()
} else {
  // CLI mode — interactive terminal
  const { runCLI } = await import('./cli/index.js')
  runCLI()
}
