import * as p from '@clack/prompts'
import pc from 'picocolors'
import { join } from 'path'
import {
  detectProviders,
  getDimensionsForProvider,
  getDefaultDataDir,
} from '../../config/index.js'
import type { ProviderType } from '../../config/index.js'
import { icons } from './styles.js'

export interface WizardResult {
  provider: ProviderType
  dataDir: string
  apiKey?: string
}

export async function runInitWizard(): Promise<WizardResult | null> {
  p.intro(pc.bgCyan(pc.black(' DocMCP Setup ')))

  // 1. Detect available providers
  const s = p.spinner()
  s.start('Checking for available embedding providers...')

  const detected = detectProviders()

  // Small delay for effect
  await new Promise((r) => setTimeout(r, 500))
  s.stop('Provider detection complete')

  // Show what was found
  console.log()
  if (detected.anthropic) {
    console.log(`  ${icons.success}  ANTHROPIC_API_KEY detected`)
  } else {
    console.log(`  ${pc.dim('–')}  ANTHROPIC_API_KEY not found`)
  }
  if (detected.openai) {
    console.log(`  ${icons.success}  OPENAI_API_KEY detected`)
  } else {
    console.log(`  ${pc.dim('–')}  OPENAI_API_KEY not found`)
  }
  if (detected.voyage) {
    console.log(`  ${icons.success}  VOYAGE_API_KEY detected`)
  } else {
    console.log(`  ${pc.dim('–')}  VOYAGE_API_KEY not found`)
  }
  console.log(`  ${icons.success}  BM25 keyword search always available`)
  console.log()

  // 2. Pick provider - always show all options
  type ProviderOption = {
    value: ProviderType
    label: string
    hint?: string
  }

  const providerOptions: ProviderOption[] = [
    {
      value: 'anthropic',
      label: 'Anthropic (via Voyage)',
      hint: detected.anthropic ? 'API key detected - recommended' : 'requires API key',
    },
    {
      value: 'openai',
      label: 'OpenAI',
      hint: detected.openai ? 'API key detected' : 'requires API key',
    },
    {
      value: 'voyage',
      label: 'Voyage AI',
      hint: detected.voyage ? 'API key detected' : 'requires API key',
    },
    {
      value: 'bm25only',
      label: 'BM25 only',
      hint: 'no embeddings, keyword search only - zero setup',
    },
  ]

  const provider = await p.select({
    message: 'Choose your embedding provider:',
    options: providerOptions,
  })

  if (p.isCancel(provider)) {
    p.cancel('Setup cancelled.')
    return null
  }

  const selectedProvider = provider as ProviderType

  // 3. If provider needs API key and not detected, ask for it
  let apiKey: string | undefined
  const needsKey = ['anthropic', 'openai', 'voyage'].includes(selectedProvider)
  const hasKey =
    (selectedProvider === 'anthropic' && detected.anthropic) ||
    (selectedProvider === 'openai' && detected.openai) ||
    (selectedProvider === 'voyage' && detected.voyage)

  if (needsKey && !hasKey) {
    const keyName =
      selectedProvider === 'anthropic'
        ? 'ANTHROPIC_API_KEY (or VOYAGE_API_KEY)'
        : selectedProvider === 'openai'
          ? 'OPENAI_API_KEY'
          : 'VOYAGE_API_KEY'

    console.log()
    console.log(pc.dim(`  You can also set ${keyName} as an environment variable.`))

    const enteredKey = await p.password({
      message: `Enter your ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key:`,
    })

    if (p.isCancel(enteredKey)) {
      p.cancel('Setup cancelled.')
      return null
    }

    if (!enteredKey || (enteredKey as string).trim() === '') {
      console.log(pc.yellow('  No API key provided. Falling back to BM25 only.'))
      return runInitWizard() // Restart wizard
    }

    apiKey = enteredKey as string

    // Show the actual config path (platform-appropriate)
    const configPath = join(getDefaultDataDir(), 'config.json')
    console.log()
    console.log(
      pc.yellow(
        `  ${icons.warning}  API key will be stored in ${configPath}`
      )
    )
    console.log(pc.dim('     Make sure this file is not committed to git.'))
  }

  // Show provider info
  const dims = getDimensionsForProvider(selectedProvider)
  if (dims) {
    console.log()
    console.log(`  ${pc.dim('Using')} ${pc.bold(selectedProvider)} ${pc.dim('embeddings')}`)
    console.log(`  ${pc.dim('Dimensions:')} ${dims}`)
  } else {
    console.log()
    console.log(`  ${pc.dim('Using')} ${pc.bold('keyword search only')} ${pc.dim('(no embeddings)')}`)
  }
  console.log()

  // 4. Data directory
  const defaultDir = getDefaultDataDir()
  const dataDir = await p.text({
    message: 'Where should DocMCP store its data?',
    initialValue: defaultDir,
    placeholder: defaultDir,
  })

  if (p.isCancel(dataDir)) {
    p.cancel('Setup cancelled.')
    return null
  }

  return {
    provider: selectedProvider,
    dataDir: dataDir as string,
    apiKey,
  }
}

export function printMCPInstructions(binaryPath?: string): void {
  const cmd = binaryPath ?? 'docmcp'

  console.log()
  console.log(pc.bold('  Add DocMCP to your AI tools:'))
  console.log()

  console.log(pc.dim('  Claude Code:'))
  console.log(pc.cyan(`  $ claude mcp add docmcp -- ${cmd} --mcp`))
  console.log()

  console.log(pc.dim('  Claude Desktop — add to claude_desktop_config.json:'))
  console.log(
    pc.dim(`  {
    "mcpServers": {
      "docmcp": {
        "command": "${cmd}",
        "args": ["--mcp"]
      }
    }
  }`)
  )
  console.log()

  console.log(pc.dim('  Cursor — add to ~/.cursor/mcp.json:'))
  console.log(
    pc.dim(`  {
    "mcpServers": {
      "docmcp": {
        "command": "${cmd}",
        "args": ["--mcp"]
      }
    }
  }`)
  )
  console.log()
}
