import { describe, it, expect } from 'vitest'
import { toMarkdown } from '../../../src/parser/markdown.js'

describe('toMarkdown', () => {
  it('should convert basic HTML to markdown', () => {
    const html = '<h1>Title</h1><p>Paragraph text.</p>'
    const result = toMarkdown(html)

    expect(result).toContain('# Title')
    expect(result).toContain('Paragraph text.')
  })

  it('should convert links correctly', () => {
    const html = '<a href="https://example.com">Link text</a>'
    const result = toMarkdown(html)

    expect(result).toBe('[Link text](https://example.com)')
  })

  it('should remove empty links', () => {
    const html = '<a href="https://example.com"></a>'
    const result = toMarkdown(html)

    expect(result).toBe('')
  })

  it('should convert code blocks with language', () => {
    const html = `
      <pre><code class="language-javascript">
function hello() {
  console.log('world');
}
      </code></pre>
    `
    const result = toMarkdown(html)

    expect(result).toContain('```javascript')
    expect(result).toContain("console.log('world')")
    expect(result).toContain('```')
  })

  it('should convert code blocks without language', () => {
    const html = `
      <pre><code>
const x = 1;
      </code></pre>
    `
    const result = toMarkdown(html)

    expect(result).toContain('```')
    expect(result).toContain('const x = 1')
  })

  it('should handle inline code', () => {
    const html = '<p>Use the <code>npm install</code> command.</p>'
    const result = toMarkdown(html)

    expect(result).toContain('`npm install`')
  })

  it('should handle inline code with backticks', () => {
    const html = '<p>Template: <code>`string`</code></p>'
    const result = toMarkdown(html)

    // Should use double backticks when content has backticks
    expect(result).toContain('``')
  })

  it('should convert lists correctly', () => {
    const html = `
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    `
    const result = toMarkdown(html)

    // Turndown may add extra spaces, so check for the marker and content
    expect(result).toContain('Item 1')
    expect(result).toContain('Item 2')
    expect(result).toContain('Item 3')
    expect(result).toMatch(/-\s+Item 1/)
  })

  it('should convert numbered lists', () => {
    const html = `
      <ol>
        <li>First</li>
        <li>Second</li>
      </ol>
    `
    const result = toMarkdown(html)

    // Turndown may add extra spaces, so check for the number and content
    expect(result).toContain('First')
    expect(result).toContain('Second')
    expect(result).toMatch(/1\.\s+First/)
    expect(result).toMatch(/2\.\s+Second/)
  })

  it('should convert headings at all levels', () => {
    const html = `
      <h1>H1</h1>
      <h2>H2</h2>
      <h3>H3</h3>
      <h4>H4</h4>
      <h5>H5</h5>
      <h6>H6</h6>
    `
    const result = toMarkdown(html)

    expect(result).toContain('# H1')
    expect(result).toContain('## H2')
    expect(result).toContain('### H3')
    expect(result).toContain('#### H4')
    expect(result).toContain('##### H5')
    expect(result).toContain('###### H6')
  })

  it('should handle bold and italic', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em> text</p>'
    const result = toMarkdown(html)

    expect(result).toContain('**bold**')
    expect(result).toContain('_italic_')
  })

  it('should convert horizontal rules', () => {
    const html = '<hr>'
    const result = toMarkdown(html)

    expect(result).toContain('---')
  })

  it('should clean up excessive whitespace', () => {
    const html = '<p>Text</p>\n\n\n\n<p>More text</p>'
    const result = toMarkdown(html)

    // Should have max 2 newlines between content
    expect(result).not.toContain('\n\n\n')
  })

  it('should trim start and end whitespace', () => {
    const html = '   <p>Content</p>   '
    const result = toMarkdown(html)

    expect(result).not.toMatch(/^\s/)
    expect(result).not.toMatch(/\s$/)
  })

  it('should handle nested elements', () => {
    const html = `
      <ul>
        <li><strong>Bold item</strong></li>
        <li>Item with <code>code</code></li>
      </ul>
    `
    const result = toMarkdown(html)

    expect(result).toContain('**Bold item**')
    expect(result).toContain('`code`')
  })

  it('should handle blockquotes', () => {
    const html = '<blockquote>Quote text</blockquote>'
    const result = toMarkdown(html)

    expect(result).toContain('> Quote text')
  })

  it('should handle images', () => {
    const html = '<img src="image.png" alt="Alt text">'
    const result = toMarkdown(html)

    expect(result).toContain('![Alt text](image.png)')
  })
})
