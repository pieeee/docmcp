import { statSync } from 'fs'
import pc from 'picocolors'
import { loadConfig, isFirstRun } from '../../config/index.js'
import { openDB, closeDB, listDocs } from '../../storage/index.js'

export async function listCommand(): Promise<void> {
  // Check if initialized
  if (await isFirstRun()) {
    console.log(pc.red('  DocMCP is not initialized. Run `docmcp init` first.'))
    process.exit(1)
  }

  const config = await loadConfig()
  const db = openDB(config.dbPath)
  const docs = listDocs(db)
  closeDB()

  if (docs.length === 0) {
    console.log()
    console.log(pc.dim('  No documentation indexed yet.'))
    console.log(pc.dim('  Run `docmcp add <url>` to index your first docs.'))
    console.log()
    return
  }

  // Calculate column widths
  const nameWidth = Math.max(12, ...docs.map((d) => d.name.length)) + 2
  const pagesWidth = 8
  const chunksWidth = 10
  const updatedWidth = 16

  // Header
  console.log()
  console.log(pc.bold('  Indexed Documentation'))
  console.log('  ' + '─'.repeat(nameWidth + pagesWidth + chunksWidth + updatedWidth + 8))

  // Column headers
  const header = [
    '#'.padStart(3),
    'Name'.padEnd(nameWidth),
    'Pages'.padStart(pagesWidth),
    'Chunks'.padStart(chunksWidth),
    'Last Updated'.padEnd(updatedWidth),
  ].join('  ')
  console.log(pc.dim(`  ${header}`))
  console.log('  ' + '─'.repeat(nameWidth + pagesWidth + chunksWidth + updatedWidth + 8))

  // Rows
  let totalChunks = 0
  docs.forEach((doc, index) => {
    totalChunks += doc.chunkCount

    const row = [
      String(index + 1).padStart(3),
      doc.name.padEnd(nameWidth),
      String(doc.pageCount).padStart(pagesWidth),
      String(doc.chunkCount).padStart(chunksWidth),
      formatTimeAgo(doc.updatedAt).padEnd(updatedWidth),
    ].join('  ')
    console.log(`  ${row}`)
  })

  console.log('  ' + '─'.repeat(nameWidth + pagesWidth + chunksWidth + updatedWidth + 8))

  // Summary
  const dbSize = getDbSize(config.dbPath)
  console.log(
    pc.dim(`  ${docs.length} docs · ${totalChunks.toLocaleString()} total chunks · ${dbSize}`)
  )
  console.log()
}

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function getDbSize(dbPath: string): string {
  try {
    const stats = statSync(dbPath)
    const size = stats.size
    if (size < 1024) return `${size}B`
    if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`
    return `${Math.round(size / 1024 / 1024)}MB`
  } catch {
    return 'unknown'
  }
}
