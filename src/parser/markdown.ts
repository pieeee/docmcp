import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  hr: '---',
  bulletListMarker: '-',
})

// Preserve code language in code blocks
turndown.addRule('codeBlocks', {
  filter: (node): boolean => {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      node.firstChild.nodeName === 'CODE'
    )
  },
  replacement: (_content, node): string => {
    const codeNode = node.firstChild as Element
    const className = codeNode.getAttribute?.('class') ?? ''
    const langMatch = className.match(/language-(\w+)/)
    const lang = langMatch?.[1] ?? ''
    const code = codeNode.textContent ?? ''
    return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`
  },
})

// Handle inline code
turndown.addRule('inlineCode', {
  filter: (node): boolean => {
    return node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE'
  },
  replacement: (content): string => {
    if (!content.trim()) return ''
    // Use backticks, escape any backticks in content
    const backticks = content.includes('`') ? '``' : '`'
    return `${backticks}${content}${backticks}`
  },
})

// Remove empty links
turndown.addRule('emptyLinks', {
  filter: (node): boolean => {
    return node.nodeName === 'A' && !node.textContent?.trim()
  },
  replacement: (): string => '',
})

// Let turndown handle tables with default behavior
// Custom table handling removed due to DOM API incompatibility

export function toMarkdown(html: string): string {
  const markdown = turndown.turndown(html)

  // Clean up excessive whitespace
  return markdown
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .replace(/^\s+|\s+$/g, '') // Trim start/end
}
