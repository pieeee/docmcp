import * as p from '@clack/prompts'
import pc from 'picocolors'
import { loadConfig, isFirstRun } from '../../config/index.js'
import {
  openDB,
  closeDB,
  storeDoc,
  storeChunk,
  storeVector,
  updateDocCounts,
  getDocByUrl,
  ensureVectorTable,
  getStoredDimensions,
  setStoredDimensions,
} from '../../storage/index.js'
import { newProvider } from '../../embedder/index.js'
import { crawl, extractDocName } from '../../crawler/index.js'
import { cleanHTML, extractTitle, toMarkdown, chunkMarkdown } from '../../parser/index.js'
import type { Chunk } from '../../parser/index.js'
import { icons } from '../ui/styles.js'

interface AddOptions {
  name?: string
  depth?: number
  maxPages?: number
  include?: string[]
  exclude?: string[]
  delay?: number
  concurrency?: number
  noSitemap?: boolean
}

export async function addCommand(url: string, options: AddOptions): Promise<void> {
  // Check if initialized
  if (await isFirstRun()) {
    console.log(pc.red('  DocMCP is not initialized. Run `docmcp init` first.'))
    process.exit(1)
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    console.log(pc.red(`  Invalid URL: ${url}`))
    process.exit(1)
  }

  console.log()
  console.log(pc.bold(`  Indexing ${pc.cyan(url)}`))
  console.log()

  const config = await loadConfig()
  const db = openDB(config.dbPath)

  // Check if already indexed
  const existingDoc = getDocByUrl(db, url)
  if (existingDoc) {
    console.log(pc.yellow(`  This URL is already indexed as "${existingDoc.name}".`))
    const shouldReindex = await p.confirm({
      message: 'Do you want to re-index it?',
      initialValue: false,
    })

    if (p.isCancel(shouldReindex) || !shouldReindex) {
      closeDB()
      return
    }

    // TODO: Delete old doc and re-index
    console.log(pc.dim('  Re-indexing not yet implemented. Please remove first with `docmcp remove`.'))
    closeDB()
    return
  }

  // Initialize embedding provider
  const provider = await newProvider(config)

  // Ensure vector table exists with correct dimensions
  if (provider.dimensions) {
    const storedDims = getStoredDimensions(db)
    if (storedDims && storedDims !== provider.dimensions) {
      console.log(
        pc.yellow(
          `  Warning: Stored dimensions (${storedDims}) don't match provider (${provider.dimensions}).`
        )
      )
      console.log(pc.yellow('  Vector search may not work correctly.'))
    }
    if (!storedDims) {
      setStoredDimensions(db, provider.dimensions)
    }
    ensureVectorTable(db, provider.dimensions)
  }

  // Determine doc name
  const docName = options.name ?? extractDocName(url)

  // Create doc record
  const docId = storeDoc(db, {
    name: docName,
    url,
    provider: provider.name,
    dimensions: provider.dimensions,
  })

  let pageCount = 0
  let chunkCount = 0
  let failedPages = 0
  const allChunks: Array<{ chunk: Chunk; rowid: number }> = []

  // Start spinner
  const s = p.spinner()
  s.start('Checking for sitemap...')

  // Crawl the site
  try {
    await crawl(
      url,
      {
        maxDepth: options.depth,
        maxPages: options.maxPages,
        include: options.include,
        exclude: options.exclude,
        delayMs: options.delay,
        concurrency: options.concurrency,
        useSitemap: !options.noSitemap,
      },
      async (page) => {
        pageCount++

        // Clean and parse HTML
        const cleanedHtml = cleanHTML(page.html)
        const title = extractTitle(page.html)
        const markdown = toMarkdown(cleanedHtml)

        // Chunk the content
        const chunks = chunkMarkdown(markdown, page.url, title, docName)

        // Store chunks
        for (const chunk of chunks) {
          const rowid = storeChunk(db, chunk, docId)
          allChunks.push({ chunk, rowid })
          chunkCount++
        }

        // Update spinner
        s.message(`Crawled ${pageCount} pages, ${chunkCount} chunks`)
      },
      (progress) => {
        if (progress.total > 0) {
          s.message(
            `Crawling ${progress.crawled}/${progress.total} pages (${chunkCount} chunks)`
          )
        } else {
          s.message(`Crawled ${progress.crawled} pages (${chunkCount} chunks)`)
        }
        failedPages = progress.failed
      }
    )

    s.stop(`Crawled ${pageCount} pages`)
  } catch (error) {
    s.stop('Crawl failed')
    console.error(pc.red(`  Error: ${error instanceof Error ? error.message : String(error)}`))
    closeDB()
    process.exit(1)
  }

  // Generate embeddings if provider supports it
  if (provider.dimensions && allChunks.length > 0) {
    const es = p.spinner()
    es.start(`Generating embeddings for ${allChunks.length} chunks...`)

    try {
      // Process in batches
      const batchSize = 50
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize)
        const texts = batch.map((c) => c.chunk.content)

        const embeddings = await provider.embedBatch(texts, 'document')

        for (let j = 0; j < batch.length; j++) {
          const embedding = embeddings[j]
          if (embedding) {
            const item = batch[j]
            if (item) {
              storeVector(db, item.rowid, embedding)
            }
          }
        }

        es.message(
          `Generated embeddings: ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`
        )
      }

      es.stop(`Generated ${allChunks.length} embeddings`)
    } catch (error) {
      es.stop('Embedding generation failed')
      console.error(
        pc.yellow(`  Warning: ${error instanceof Error ? error.message : String(error)}`)
      )
      console.log(pc.dim('  Continuing without embeddings (BM25 search will still work)'))
    }
  }

  // Update doc counts
  updateDocCounts(db, docId, pageCount, chunkCount)
  closeDB()

  // Summary
  console.log()
  console.log(`  ${icons.success}  Done!`)
  console.log()
  console.log(`  ${pc.bold('Name:')}      ${docName}`)
  console.log(`  ${pc.bold('Pages:')}     ${pageCount}`)
  console.log(`  ${pc.bold('Chunks:')}    ${chunkCount}`)
  if (failedPages > 0) {
    console.log(`  ${pc.bold('Failed:')}    ${pc.yellow(String(failedPages))}`)
  }
  console.log()
  console.log(pc.dim(`  Try it: docmcp search "your query" --doc "${docName}"`))
  console.log()
}
