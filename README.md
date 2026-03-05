# DocMCP

Index any documentation website and search it from AI coding assistants via the Model Context Protocol (MCP).

## Features

- **Crawl & Index**: Automatically crawl documentation sites via sitemap or recursive links
- **Hybrid Search**: Combines BM25 keyword search with vector embeddings for best results
- **MCP Integration**: Works with Claude Code, Claude Desktop, Cursor, and any MCP-compatible tool
- **Multiple Providers**: Anthropic (Voyage), OpenAI, or BM25-only (zero setup)
- **Cross-Platform**: Works on macOS, Linux, and Windows

## Installation

```bash
npm install -g @pieeee/docmcp
```

### Requirements

- Node.js 20+
- One of: Anthropic API key, OpenAI API key, or use BM25-only mode (no API needed)

## Quick Start

```bash
# Initial setup
docmcp init

# Index a documentation site
docmcp add https://tailwindcss.com/docs

# List indexed docs
docmcp list
```

## MCP Configuration

### Claude Code

```bash
claude mcp add docmcp -- docmcp serve
```

Or add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "docmcp": {
      "command": "docmcp",
      "args": ["serve"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "docmcp": {
      "command": "docmcp",
      "args": ["serve"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "docmcp": {
      "command": "docmcp",
      "args": ["serve"]
    }
  }
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `docmcp init` | Setup wizard - configure embedding provider and data directory |
| `docmcp add <url>` | Crawl and index a documentation site |
| `docmcp list` | Show all indexed documentation |
| `docmcp remove <name>` | Remove indexed documentation |
| `docmcp serve` | Start MCP server (stdio transport) |

### Add Command Options

```bash
docmcp add <url> [options]

Options:
  -n, --name <name>           Override auto-detected doc name
  -d, --depth <number>        Max crawl depth (default: 10)
  -m, --max-pages <number>    Max pages to crawl (default: unlimited)
  -i, --include <pattern...>  Only crawl URLs matching pattern (glob)
  -e, --exclude <pattern...>  Skip URLs matching pattern (glob)
  --delay <ms>                Delay between requests (default: 200)
  --concurrency <number>      Parallel requests (default: 3)
  --no-sitemap                Skip sitemap, force recursive crawl
  --openapi                   Treat URL as OpenAPI/Swagger JSON spec
```

### OpenAPI/Swagger Support

You can index OpenAPI specs directly:

```bash
docmcp add https://api.example.com/openapi.json --openapi
docmcp add https://petstore.swagger.io/v2/swagger.json --openapi
```

This parses the spec and indexes all endpoints, parameters, and schemas for search.

## MCP Tools

When connected as an MCP server, DocMCP exposes these tools:

| Tool | Description |
|------|-------------|
| `search_docs` | Search indexed documentation with hybrid BM25 + vector search |
| `list_docs` | List all indexed documentation sources |

### search_docs

Search your indexed documentation:

```
search_docs(query: "how to center a div", doc?: "Tailwind", limit?: 5)
```

Parameters:
- `query` (required): Search query
- `doc` (optional): Filter to specific documentation
- `limit` (optional): Max results (default: 5)

## Embedding Providers

| Provider | API Key Required | Notes |
|----------|-----------------|-------|
| `anthropic` | `ANTHROPIC_API_KEY` | Uses Voyage AI embeddings (recommended) |
| `openai` | `OPENAI_API_KEY` | Uses text-embedding-3-small |
| `bm25only` | None | Keyword search only, zero setup |

Set your API key as an environment variable or enter it during `docmcp init`.

## Data Storage

All data is stored in `~/.docmcp/`:

```
~/.docmcp/
├── config.json    # Configuration (API keys stored here)
└── db/
    └── docs.db    # SQLite database with FTS5 + vector search
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS (Intel) | Full | |
| macOS (Apple Silicon) | Full | |
| Linux (x64) | Full | |
| Linux (ARM64) | Full | |
| Windows (x64) | Full | May require build tools for native modules |

### Windows Prerequisites

If installation fails on Windows due to native module compilation:

1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Or run: `npm install --global windows-build-tools`
3. Retry: `npm install -g docmcp`

## How It Works

1. **Crawl**: DocMCP crawls documentation sites using sitemap or recursive link following
2. **Parse**: HTML is cleaned and converted to Markdown, preserving code blocks
3. **Chunk**: Content is split at heading boundaries into ~512 token chunks
4. **Index**: Chunks are stored in SQLite with FTS5 (BM25) and vector embeddings
5. **Search**: Queries use hybrid search combining keyword and semantic matching

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
