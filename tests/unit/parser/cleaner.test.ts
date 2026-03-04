import { describe, it, expect } from 'vitest'
import { cleanHTML, extractTitle } from '../../../src/parser/cleaner.js'

describe('cleanHTML', () => {
  it('should remove navigation elements', () => {
    const html = `
      <html>
        <body>
          <nav>Navigation menu</nav>
          <main>Main content here</main>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).not.toContain('Navigation menu')
    expect(result).toContain('Main content here')
  })

  it('should remove header and footer', () => {
    const html = `
      <html>
        <body>
          <header>Site header</header>
          <main>Main content</main>
          <footer>Site footer</footer>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).not.toContain('Site header')
    expect(result).not.toContain('Site footer')
    expect(result).toContain('Main content')
  })

  it('should remove sidebar elements', () => {
    const html = `
      <html>
        <body>
          <aside>Sidebar content</aside>
          <div class="sidebar">More sidebar</div>
          <main>Main content</main>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).not.toContain('Sidebar content')
    expect(result).not.toContain('More sidebar')
    expect(result).toContain('Main content')
  })

  it('should remove script and style tags', () => {
    const html = `
      <html>
        <body>
          <script>alert('hello')</script>
          <style>.class { color: red; }</style>
          <main>Main content</main>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).not.toContain('alert')
    expect(result).not.toContain('color: red')
    expect(result).toContain('Main content')
  })

  it('should prefer main content selectors', () => {
    const html = `
      <html>
        <body>
          <div>Outside content</div>
          <main>Inside main tag</main>
          <div>More outside</div>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).toContain('Inside main tag')
    expect(result).not.toContain('Outside content')
    expect(result).not.toContain('More outside')
  })

  it('should handle article tag as main content', () => {
    const html = `
      <html>
        <body>
          <div>Outside</div>
          <article>Article content here</article>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).toContain('Article content here')
  })

  it('should throw on oversized HTML', () => {
    // Create HTML larger than 5MB
    const hugeContent = 'x'.repeat(6 * 1024 * 1024)
    const html = `<html><body>${hugeContent}</body></html>`

    expect(() => cleanHTML(html)).toThrow('exceeds maximum size')
  })

  it('should handle HTML just under size limit', () => {
    // Create HTML just under 5MB
    const content = 'x'.repeat(4 * 1024 * 1024)
    const html = `<html><body><main>${content}</main></body></html>`

    expect(() => cleanHTML(html)).not.toThrow()
  })

  it('should remove table of contents', () => {
    const html = `
      <html>
        <body>
          <div class="toc">Table of contents</div>
          <div class="table-of-contents">TOC</div>
          <main>Main content</main>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).not.toContain('Table of contents')
    expect(result).not.toContain('TOC')
    expect(result).toContain('Main content')
  })

  it('should fallback to body when no main content found', () => {
    const html = `
      <html>
        <body>
          <div>Body content without main tag</div>
        </body>
      </html>
    `

    const result = cleanHTML(html)

    expect(result).toContain('Body content without main tag')
  })
})

describe('extractTitle', () => {
  it('should extract from og:title meta tag', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Open Graph Title">
          <title>Regular Title</title>
        </head>
      </html>
    `

    expect(extractTitle(html)).toBe('Open Graph Title')
  })

  it('should extract from title tag when no og:title', () => {
    const html = `
      <html>
        <head>
          <title>Page Title - Site Name</title>
        </head>
      </html>
    `

    // Should remove common suffixes
    expect(extractTitle(html)).toBe('Page Title')
  })

  it('should extract from h1 when no title tag', () => {
    const html = `
      <html>
        <body>
          <h1>Main Heading</h1>
        </body>
      </html>
    `

    expect(extractTitle(html)).toBe('Main Heading')
  })

  it('should return Untitled when no title found', () => {
    const html = `<html><body>No title here</body></html>`

    expect(extractTitle(html)).toBe('Untitled')
  })

  it('should handle title with pipe separator', () => {
    const html = `
      <html>
        <head>
          <title>Documentation | Company</title>
        </head>
      </html>
    `

    expect(extractTitle(html)).toBe('Documentation')
  })

  it('should handle title with dash separator', () => {
    const html = `
      <html>
        <head>
          <title>Getting Started - Docs</title>
        </head>
      </html>
    `

    expect(extractTitle(html)).toBe('Getting Started')
  })

  it('should trim whitespace from titles', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="  Spaced Title  ">
        </head>
      </html>
    `

    expect(extractTitle(html)).toBe('Spaced Title')
  })
})
