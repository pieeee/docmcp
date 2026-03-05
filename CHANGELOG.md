# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-05

### Added

- OpenAPI/Swagger spec support with `--openapi` flag
- New parser for OpenAPI 3.x and Swagger 2.x specs
- Extracts endpoints, parameters, request bodies, responses, and schemas
- 19 new tests for OpenAPI parsing (101 total)

## [0.1.0] - 2026-03-05

### Added

- Initial release
- CLI commands: `init`, `add`, `list`, `remove`, `serve`
- MCP tools: `search_docs`, `list_docs`
- Embedding providers: Anthropic (Voyage), OpenAI, BM25-only
- Hybrid search combining BM25 keyword search with vector embeddings
- Reciprocal Rank Fusion (RRF) for result merging
- Sitemap-first crawling with recursive fallback
- Heading-based content chunking with breadcrumb context
- SQLite storage with FTS5 and sqlite-vec
- Cross-platform support (macOS, Linux, Windows)

### Security

- API key file permissions restricted to owner-only on Unix
- Input size limits to prevent DoS
- Graceful error handling in MCP server

[Unreleased]: https://github.com/pieeee/docmcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/pieeee/docmcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pieeee/docmcp/releases/tag/v0.1.0
