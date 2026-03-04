import { describe, it, expect } from 'vitest'
import { chunkMarkdown } from '../../../src/parser/chunker.js'

describe('chunkMarkdown', () => {
  const baseUrl = 'https://example.com/docs/page'
  const title = 'Test Page'
  const docName = 'TestDoc'

  it('should create chunks from simple markdown', () => {
    const markdown = `# Introduction

This is the introduction paragraph.

## Getting Started

This section explains how to get started.`

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0]).toHaveProperty('id')
    expect(chunks[0]).toHaveProperty('url', baseUrl)
    expect(chunks[0]).toHaveProperty('title', title)
    expect(chunks[0]).toHaveProperty('breadcrumb')
    expect(chunks[0]).toHaveProperty('content')
    expect(chunks[0]).toHaveProperty('tokenCount')
  })

  it('should split content at heading boundaries', () => {
    const markdown = `# Heading 1

Content for heading 1.

## Heading 2

Content for heading 2.

## Heading 3

Content for heading 3.`

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    // Should have multiple chunks based on headings
    expect(chunks.length).toBeGreaterThanOrEqual(2)
  })

  it('should include breadcrumb in chunk content', () => {
    const markdown = `# Main Topic

## Subtopic

This is content under the subtopic.`

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    // Find chunk with subtopic content
    const subtopicChunk = chunks.find(c => c.heading === 'Subtopic')
    expect(subtopicChunk).toBeDefined()
    expect(subtopicChunk!.breadcrumb).toContain(docName)
    expect(subtopicChunk!.content).toContain(docName)
  })

  it('should not split code blocks', () => {
    const markdown = `# Code Example

\`\`\`javascript
function example() {
  // # This is not a heading
  const x = 1;
}
\`\`\``

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    // The code block should remain intact
    const codeChunk = chunks.find(c => c.content.includes('function example'))
    expect(codeChunk).toBeDefined()
    expect(codeChunk!.content).toContain('# This is not a heading')
    expect(codeChunk!.content).toContain('const x = 1')
  })

  it('should handle Windows line endings (CRLF)', () => {
    const markdown = '# Heading\r\n\r\nContent with Windows line endings.\r\n\r\nMore content.'

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    expect(chunks.length).toBeGreaterThan(0)
    // Content should be properly parsed without \r artifacts
    expect(chunks[0]!.content).not.toContain('\r')
  })

  it('should handle mixed line endings', () => {
    const markdown = '# Heading\n\nUnix content.\r\n\r\nWindows content.\n'

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    expect(chunks.length).toBeGreaterThan(0)
  })

  it('should generate unique IDs for each chunk', () => {
    const markdown = `# Section 1

Content 1.

# Section 2

Content 2.`

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    const ids = chunks.map(c => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should skip very small chunks without headings', () => {
    const markdown = `# Main Content

This is substantial content that should create a chunk.

Hi

More substantial content here that should also create a chunk.`

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    // "Hi" alone should be too small to create a chunk
    const tinyChunk = chunks.find(c => c.content.trim() === 'Hi')
    expect(tinyChunk).toBeUndefined()
  })

  it('should handle empty markdown', () => {
    const chunks = chunkMarkdown('', baseUrl, title, docName)
    expect(chunks).toEqual([])
  })

  it('should handle markdown with only whitespace', () => {
    const chunks = chunkMarkdown('   \n\n   \n', baseUrl, title, docName)
    expect(chunks).toEqual([])
  })

  it('should handle nested headings correctly', () => {
    const markdown = `# Level 1

Content at level 1.

## Level 2

Content at level 2.

### Level 3

Content at level 3.

## Another Level 2

Back to level 2 content.`

    const chunks = chunkMarkdown(markdown, baseUrl, title, docName)

    // Should have proper breadcrumb hierarchy
    const level3Chunk = chunks.find(c => c.heading === 'Level 3')
    expect(level3Chunk).toBeDefined()
    expect(level3Chunk!.breadcrumb).toContain('Level 1')
    expect(level3Chunk!.breadcrumb).toContain('Level 2')
    expect(level3Chunk!.breadcrumb).toContain('Level 3')
  })
})
