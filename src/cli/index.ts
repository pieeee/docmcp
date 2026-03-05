import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { addCommand } from './commands/add.js'
import { listCommand } from './commands/list.js'
import { removeCommand } from './commands/remove.js'
import { serveCommand } from './commands/serve.js'

export function runCLI(): void {
  const program = new Command()

  program
    .name('docmcp')
    .description('Index documentation websites and search them from AI tools')
    .version('0.2.0')

  program
    .command('init')
    .description('Set up DocMCP with a beautiful setup wizard')
    .action(initCommand)

  program
    .command('add <url>')
    .description('Crawl and index a documentation website')
    .option('-n, --name <name>', 'Override auto-detected doc name')
    .option('-d, --depth <number>', 'Max crawl depth', parseInt)
    .option('-m, --max-pages <number>', 'Max pages to crawl', parseInt)
    .option('-i, --include <pattern...>', 'Only crawl URLs matching pattern (glob)')
    .option('-e, --exclude <pattern...>', 'Skip URLs matching pattern (glob)')
    .option('--delay <ms>', 'Delay between requests in ms', parseInt)
    .option('--concurrency <number>', 'Parallel requests', parseInt)
    .option('--no-sitemap', 'Skip sitemap, force recursive crawl')
    .option('--openapi', 'Treat URL as OpenAPI/Swagger JSON spec')
    .action(addCommand)

  program
    .command('list')
    .description('Show all indexed documentation')
    .action(listCommand)

  program
    .command('remove <name>')
    .description('Remove an indexed documentation')
    .action(removeCommand)

  program
    .command('serve')
    .description('Start MCP server (stdio transport)')
    .action(serveCommand)

  program.parse()
}
