/**
 * Vitest setup file
 * Provides polyfills for Node 18 compatibility
 */

// Polyfill File global for Node 18 (required by undici/cheerio)
if (typeof globalThis.File === 'undefined') {
  // @ts-expect-error - File polyfill for older Node versions
  globalThis.File = class File extends Blob {
    name: string
    lastModified: number

    constructor(
      chunks: BlobPart[],
      name: string,
      options?: FilePropertyBag
    ) {
      super(chunks, options)
      this.name = name
      this.lastModified = options?.lastModified ?? Date.now()
    }
  }
}
