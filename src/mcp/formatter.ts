import type { SearchResult, DocMeta } from '../storage/index.js'

export function formatSearchResults(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `No results found for "${query}". Try \`list_docs\` to see what's indexed.`
  }

  const lines = [`Found ${results.length} results for "${query}":`, '']

  for (const [i, r] of results.entries()) {
    lines.push(`## Result ${i + 1}: ${r.breadcrumb ?? r.title}`)
    lines.push(`**Source:** ${r.url}`)
    lines.push(`**Score:** ${r.score.toFixed(3)}`)
    lines.push('')
    lines.push(r.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export function formatDocList(docs: DocMeta[]): string {
  if (docs.length === 0) {
    return 'No documentation indexed yet. Use `add_docs` to index a documentation site.'
  }

  const lines = ['# Indexed Documentation', '']

  for (const doc of docs) {
    lines.push(`## ${doc.name}`)
    lines.push(`- **URL:** ${doc.url}`)
    lines.push(`- **Pages:** ${doc.pageCount}`)
    lines.push(`- **Chunks:** ${doc.chunkCount}`)
    lines.push(`- **Provider:** ${doc.provider}`)
    lines.push(`- **Last updated:** ${formatDate(doc.updatedAt)}`)
    lines.push('')
  }

  lines.push(`---`)
  lines.push(`Total: ${docs.length} documentation sources, ${docs.reduce((sum, d) => sum + d.chunkCount, 0)} chunks`)

  return lines.join('\n')
}

export function formatChunk(chunk: {
  id: string
  url: string
  title: string
  breadcrumb: string | null
  content: string
}): string {
  const lines = [
    `# ${chunk.breadcrumb ?? chunk.title}`,
    '',
    `**Source:** ${chunk.url}`,
    `**Chunk ID:** ${chunk.id}`,
    '',
    '---',
    '',
    chunk.content,
  ]

  return lines.join('\n')
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
