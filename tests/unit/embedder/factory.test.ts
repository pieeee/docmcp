import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Config } from '../../../src/config/config.js'

// We'll test the factory logic without actually creating real providers
describe('embedder factory', () => {
  const createMockConfig = (provider: string, apiKey?: string): Config => ({
    version: 1,
    dataDir: '/tmp/docmcp',
    dbPath: '/tmp/docmcp/db/docs.db',
    embedding: {
      provider: provider as any,
      apiKey,
      dimensions: provider === 'bm25only' ? null : 1536,
    },
    crawler: {
      defaultDelay: 200,
      defaultConcurrency: 3,
      defaultMaxDepth: 10,
      userAgent: 'DocMCP/0.1.0',
    },
    search: {
      defaultLimit: 5,
      rrfK: 60,
    },
  })

  describe('provider selection', () => {
    it('should select bm25only provider when configured', async () => {
      const { newProvider } = await import('../../../src/embedder/factory.js')
      const config = createMockConfig('bm25only')

      const provider = await newProvider(config)

      expect(provider.name).toBe('bm25only')
      expect(provider.dimensions).toBeNull()
    })

    it('should throw error for openai provider without API key', async () => {
      const { newProvider } = await import('../../../src/embedder/factory.js')
      const config = createMockConfig('openai')

      await expect(newProvider(config)).rejects.toThrow()
    })

    it('should throw error for anthropic provider without API key', async () => {
      const { newProvider } = await import('../../../src/embedder/factory.js')
      const config = createMockConfig('anthropic')

      await expect(newProvider(config)).rejects.toThrow()
    })
  })

  describe('bm25only provider', () => {
    it('should return null for embed()', async () => {
      const { newProvider } = await import('../../../src/embedder/factory.js')
      const config = createMockConfig('bm25only')

      const provider = await newProvider(config)
      const result = await provider.embed('test text')

      expect(result).toBeNull()
    })

    it('should return array of nulls for embedBatch()', async () => {
      const { newProvider } = await import('../../../src/embedder/factory.js')
      const config = createMockConfig('bm25only')

      const provider = await newProvider(config)
      const results = await provider.embedBatch(['text1', 'text2', 'text3'])

      expect(results).toHaveLength(3)
      expect(results.every(r => r === null)).toBe(true)
    })
  })
})

describe('EmbeddingProvider interface', () => {
  it('should have required properties and methods', async () => {
    const { newProvider } = await import('../../../src/embedder/factory.js')
    const config: Config = {
      version: 1,
      dataDir: '/tmp/docmcp',
      dbPath: '/tmp/docmcp/db/docs.db',
      embedding: {
        provider: 'bm25only',
        dimensions: null,
      },
      crawler: {
        defaultDelay: 200,
        defaultConcurrency: 3,
        defaultMaxDepth: 10,
        userAgent: 'DocMCP/0.1.0',
      },
      search: {
        defaultLimit: 5,
        rrfK: 60,
      },
    }

    const provider = await newProvider(config)

    // Check required properties
    expect(provider).toHaveProperty('name')
    expect(typeof provider.name).toBe('string')

    expect(provider).toHaveProperty('dimensions')

    // Check required methods
    expect(typeof provider.embed).toBe('function')
    expect(typeof provider.embedBatch).toBe('function')
  })
})
