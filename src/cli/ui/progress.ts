import pc from 'picocolors'

/**
 * Check if the terminal supports ANSI escape sequences
 */
function supportsAnsiEscapes(): boolean {
  // Not a TTY, no escape sequence support
  if (!process.stdout.isTTY) return false

  // On Windows, check for modern terminal (Windows Terminal, VS Code, etc.)
  if (process.platform === 'win32') {
    // Windows Terminal sets WT_SESSION
    // VS Code terminal sets TERM_PROGRAM
    // ConEmu/Cmder set ConEmuANSI
    return !!(
      process.env.WT_SESSION ||
      process.env.TERM_PROGRAM ||
      process.env.ConEmuANSI === 'ON' ||
      process.env.ANSICON
    )
  }

  // Unix-like systems generally support ANSI
  return true
}

export interface ProgressState {
  crawled: number
  total: number
  indexed: number
  failed: number
  currentUrl: string
}

const BAR_WIDTH = 30

export function renderProgress(state: ProgressState): string {
  const { crawled, total, indexed, failed, currentUrl } = state

  // Calculate percentages
  const crawlPct = total > 0 ? Math.min(100, Math.round((crawled / total) * 100)) : 0
  const indexPct = crawled > 0 ? Math.min(100, Math.round((indexed / crawled) * 100)) : 0

  // Build progress bars
  const crawlBar = buildProgressBar(crawlPct)
  const indexBar = buildProgressBar(indexPct)

  // Format current URL (truncate if too long)
  const maxUrlLen = 50
  const displayUrl =
    currentUrl.length > maxUrlLen
      ? '...' + currentUrl.slice(-(maxUrlLen - 3))
      : currentUrl

  const lines = [
    '',
    `  ${pc.bold('Crawling')}  ${crawlBar}  ${pc.yellow(crawlPct + '%')}  (${crawled}/${total} pages)`,
    `  ${pc.bold('Indexing')}  ${indexBar}  ${pc.yellow(indexPct + '%')}  (${indexed} chunks)`,
    '',
    `  ${pc.dim('Current:')} ${pc.dim(displayUrl)}`,
  ]

  if (failed > 0) {
    lines.push(`  ${pc.red(`${failed} failed`)}`)
  }

  return lines.join('\n')
}

function buildProgressBar(percent: number): string {
  const filled = Math.round((percent / 100) * BAR_WIDTH)
  const empty = BAR_WIDTH - filled

  const filledBar = pc.cyan('█'.repeat(filled))
  const emptyBar = pc.dim('░'.repeat(empty))

  return filledBar + emptyBar
}

export function clearProgress(): void {
  // Only use ANSI escape sequences if supported
  if (supportsAnsiEscapes()) {
    // Move cursor up 6 lines and clear to end of screen
    process.stdout.write('\x1B[6A\x1B[0J')
  }
  // On terminals without ANSI support, we just continue printing
  // (output will scroll, which is acceptable fallback behavior)
}
