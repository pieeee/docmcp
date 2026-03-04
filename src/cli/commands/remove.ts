import * as p from '@clack/prompts'
import pc from 'picocolors'
import { loadConfig, isFirstRun } from '../../config/index.js'
import { openDB, closeDB, getDocByName, getDocByUrl, deleteDoc } from '../../storage/index.js'
import { icons } from '../ui/styles.js'

export async function removeCommand(nameOrUrl: string): Promise<void> {
  if (await isFirstRun()) {
    console.log(pc.red('  DocMCP is not initialized. Run `docmcp init` first.'))
    process.exit(1)
  }

  const config = await loadConfig()
  const db = openDB(config.dbPath)

  // Try to find by name first, then by URL
  let doc = getDocByName(db, nameOrUrl)
  if (!doc) {
    doc = getDocByUrl(db, nameOrUrl)
  }

  if (!doc) {
    console.log(pc.red(`  Documentation "${nameOrUrl}" not found.`))
    closeDB()
    process.exit(1)
  }

  const shouldDelete = await p.confirm({
    message: `Delete "${doc.name}" (${doc.chunkCount} chunks)?`,
    initialValue: false,
  })

  if (p.isCancel(shouldDelete) || !shouldDelete) {
    closeDB()
    return
  }

  deleteDoc(db, doc.id)
  closeDB()

  console.log()
  console.log(`  ${icons.success}  Removed "${doc.name}"`)
  console.log()
}
