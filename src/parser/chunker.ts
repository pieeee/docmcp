import { createHash } from 'crypto'
import type { Chunk } from './types.js'
import { countTokens } from './tokens.js'

const MAX_TOKENS = 512
const MIN_CHUNK_TOKENS = 50
const MAX_CHUNK_CONTENT_SIZE = 32 * 1024 // 32KB max per chunk content

interface Section {
  heading: string | null
  level: number
  content: string
}

// Code block regex: matches ``` blocks
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g

function hashChunk(url: string, heading: string | null, index: number): string {
  const input = `${url}|${heading ?? ''}|${index}`
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function splitIntoSections(markdown: string): Section[] {
  const sections: Section[] = []
  let currentSection: Section = {
    heading: null,
    level: 0,
    content: '',
  }

  // Protect code blocks from being split on headings
  const codeBlocks: string[] = []
  const protectedMarkdown = markdown.replace(CODE_BLOCK_REGEX, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(match)
    return placeholder
  })

  // Handle both Unix (\n) and Windows (\r\n) line endings
  const lines = protectedMarkdown.split(/\r?\n/)

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      // Save current section if it has content
      if (currentSection.content.trim()) {
        sections.push(currentSection)
      }

      // Start new section
      const level = headingMatch[1]?.length ?? 0
      const heading = headingMatch[2]?.trim() ?? ''
      currentSection = {
        heading,
        level,
        content: '',
      }
    } else {
      currentSection.content += line + '\n'
    }
  }

  // Save last section
  if (currentSection.content.trim() || currentSection.heading) {
    sections.push(currentSection)
  }

  // Restore code blocks
  return sections.map(section => ({
    ...section,
    content: section.content.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
      return codeBlocks[parseInt(index, 10)] ?? ''
    }),
  }))
}

function buildBreadcrumb(docName: string, headings: string[]): string {
  const parts = [docName, ...headings].filter(Boolean)
  return parts.join(' > ')
}

function splitLongSection(content: string, maxTokens: number): string[] {
  const chunks: string[] = []
  // Handle both Unix and Windows line endings for paragraph splits
  const paragraphs = content.split(/(?:\r?\n){2,}/)

  let currentChunk = ''
  let currentTokens = 0

  for (const para of paragraphs) {
    const paraTokens = countTokens(para)

    // If single paragraph exceeds max, we need to split it
    if (paraTokens > maxTokens) {
      // Save current chunk if any
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
        currentTokens = 0
      }

      // Split paragraph by sentences
      const sentences = para.split(/(?<=[.!?])\s+/)
      let sentenceChunk = ''
      let sentenceTokens = 0

      for (const sentence of sentences) {
        const sTokens = countTokens(sentence)

        if (sentenceTokens + sTokens > maxTokens && sentenceChunk.trim()) {
          chunks.push(sentenceChunk.trim())
          sentenceChunk = sentence
          sentenceTokens = sTokens
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence
          sentenceTokens += sTokens
        }
      }

      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim())
      }
    } else if (currentTokens + paraTokens > maxTokens) {
      // Start new chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = para
      currentTokens = paraTokens
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
      currentTokens += paraTokens
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export function chunkMarkdown(
  markdown: string,
  url: string,
  title: string,
  docName: string
): Chunk[] {
  const sections = splitIntoSections(markdown)
  const chunks: Chunk[] = []

  // Track heading hierarchy for breadcrumbs
  const headingStack: string[] = []

  let chunkIndex = 0

  for (const section of sections) {
    // Update heading stack based on level
    if (section.heading) {
      // Pop headings at same or higher level
      while (headingStack.length >= section.level && headingStack.length > 0) {
        headingStack.pop()
      }
      headingStack.push(section.heading)
    }

    const content = section.content.trim()
    if (!content) continue

    const breadcrumb = buildBreadcrumb(docName, [...headingStack])
    const contentTokens = countTokens(content)

    // If content is small enough, create single chunk
    if (contentTokens <= MAX_TOKENS) {
      // Skip very small chunks (likely noise)
      if (contentTokens < MIN_CHUNK_TOKENS && !section.heading) {
        continue
      }

      const fullContent = `${breadcrumb}\n\n${content}`

      // Enforce size limit
      if (fullContent.length > MAX_CHUNK_CONTENT_SIZE) {
        // Content is too large even if tokens are OK, force split
        const subChunks = splitLongSection(content, MAX_TOKENS - countTokens(breadcrumb) - 10)
        for (const subContent of subChunks) {
          const subFullContent = `${breadcrumb}\n\n${subContent}`.slice(0, MAX_CHUNK_CONTENT_SIZE)
          chunks.push({
            id: hashChunk(url, section.heading, chunkIndex++),
            url,
            title,
            heading: section.heading,
            breadcrumb,
            content: subFullContent,
            tokenCount: countTokens(subFullContent),
          })
        }
        continue
      }

      chunks.push({
        id: hashChunk(url, section.heading, chunkIndex++),
        url,
        title,
        heading: section.heading,
        breadcrumb,
        content: fullContent,
        tokenCount: countTokens(fullContent),
      })
    } else {
      // Split into smaller chunks
      const subChunks = splitLongSection(content, MAX_TOKENS - countTokens(breadcrumb) - 10)

      for (const subContent of subChunks) {
        const fullContent = `${breadcrumb}\n\n${subContent}`

        chunks.push({
          id: hashChunk(url, section.heading, chunkIndex++),
          url,
          title,
          heading: section.heading,
          breadcrumb,
          content: fullContent,
          tokenCount: countTokens(fullContent),
        })
      }
    }
  }

  return chunks
}
