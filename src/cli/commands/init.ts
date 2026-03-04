import * as p from '@clack/prompts'
import pc from 'picocolors'
import {
  loadConfig,
  saveConfig,
  initializeDataDir,
  isFirstRun,
  getDimensionsForProvider,
  getDefaultDbPath,
} from '../../config/index.js'
import { openDB, closeDB } from '../../storage/index.js'
import { printBanner } from '../ui/banner.js'
import { runInitWizard, printMCPInstructions } from '../ui/wizard.js'
import { icons } from '../ui/styles.js'

export async function initCommand(): Promise<void> {
  printBanner()

  // Check if already initialized
  const firstRun = await isFirstRun()
  if (!firstRun) {
    const config = await loadConfig()
    console.log(pc.yellow('  DocMCP is already initialized.'))
    console.log(pc.dim(`  Data directory: ${config.dataDir}`))
    console.log(pc.dim(`  Provider: ${config.embedding.provider}`))
    console.log()

    const shouldReinit = await p.confirm({
      message: 'Do you want to reconfigure?',
      initialValue: false,
    })

    if (p.isCancel(shouldReinit) || !shouldReinit) {
      return
    }
  }

  // Run the setup wizard
  const result = await runInitWizard()
  if (!result) {
    return
  }

  // Initialize storage
  const s = p.spinner()
  s.start('Setting up storage...')

  try {
    // Create directories
    await initializeDataDir(result.dataDir)
    console.log(`  ${icons.success}  Created ${result.dataDir}/`)

    // Save config
    const config = await loadConfig()
    config.dataDir = result.dataDir
    config.dbPath = getDefaultDbPath(result.dataDir)
    config.embedding.provider = result.provider
    config.embedding.dimensions = getDimensionsForProvider(result.provider)

    // Save API key if user entered one
    if (result.apiKey) {
      config.embedding.apiKey = result.apiKey
    }

    await saveConfig(config)
    console.log(`  ${icons.success}  Saved configuration`)

    // Initialize database
    openDB(config.dbPath)
    closeDB()
    console.log(`  ${icons.success}  Initialized SQLite database`)
    console.log(`  ${icons.success}  FTS5 index ready`)

    if (config.embedding.dimensions) {
      console.log(`  ${icons.success}  Vector store ready (${config.embedding.dimensions} dimensions)`)
    }

    s.stop('Storage ready')
  } catch (error) {
    s.stop('Setup failed')
    console.error(pc.red(`  Error: ${error instanceof Error ? error.message : String(error)}`))
    process.exit(1)
  }

  // Show MCP instructions
  printMCPInstructions()

  p.outro(pc.green("All done! Run `docmcp add <url>` to index your first docs."))
}
