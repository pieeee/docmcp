# Contributing to DocMCP

Thank you for your interest in contributing to DocMCP!

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/sheikhahnafhasan/docmcp.git
   cd docmcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run from source with tsx |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

## Code Style

- **TypeScript**: Strict mode enabled, no `any` types
- **Async/await**: Use async/await, avoid raw `.then()` chains
- **Named exports**: No default exports (except entry point)
- **Formatting**: Use consistent indentation (2 spaces)

### Type Safety

- Validate external data with Zod schemas
- Avoid type assertions (`as`) where possible
- Use proper generics over `any`

### Error Handling

- Throw typed errors
- Catch at command/tool boundaries
- Provide user-friendly error messages

## Project Structure

```
src/
├── index.ts              # Entry point (CLI/MCP router)
├── cli/
│   ├── commands/         # CLI command handlers
│   └── ui/               # Terminal UI components
├── config/               # Configuration management
├── crawler/              # Web crawling
├── parser/               # HTML cleaning, markdown, chunking
├── embedder/
│   ├── types.ts          # Provider interface
│   ├── factory.ts        # Provider instantiation
│   └── providers/        # Embedding implementations
├── storage/              # SQLite database
└── mcp/
    ├── server.ts         # MCP server setup
    └── tools/            # MCP tool implementations
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Use fixtures in `tests/fixtures/`
- Name test files with `.test.ts` suffix

## Pull Request Process

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make changes** and add tests
4. **Run checks**: `npm run typecheck && npm test && npm run lint`
5. **Commit** with clear messages
6. **Push** and create a Pull Request

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add support for X`
- `fix: resolve issue with Y`
- `docs: update README`
- `test: add tests for Z`
- `refactor: simplify chunking logic`

## Reporting Issues

When reporting issues, please include:

- DocMCP version (`docmcp --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages (if any)

## Questions?

Feel free to open an issue for questions or discussion.
