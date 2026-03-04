export type ProviderType = 'anthropic' | 'openai' | 'voyage' | 'local' | 'bm25only'

export interface DetectedProviders {
  anthropic: boolean
  openai: boolean
  voyage: boolean
  local: boolean
  bm25only: boolean
}

export function detectProviders(): DetectedProviders {
  return {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    voyage: !!process.env.VOYAGE_API_KEY,
    local: true, // Always available (requires model download)
    bm25only: true, // Always available
  }
}

export function getApiKeyForProvider(provider: ProviderType): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY
    case 'openai':
      return process.env.OPENAI_API_KEY
    case 'voyage':
      return process.env.VOYAGE_API_KEY
    default:
      return undefined
  }
}

export function getRecommendedProvider(): ProviderType {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.VOYAGE_API_KEY) return 'voyage'
  return 'bm25only'
}

export function getDimensionsForProvider(provider: ProviderType): number | null {
  switch (provider) {
    case 'anthropic':
      return 1024 // voyage-3
    case 'openai':
      return 1536 // text-embedding-3-small
    case 'voyage':
      return 512 // voyage-3-lite
    case 'local':
      return 768 // bge-base-en-v1.5
    case 'bm25only':
    default:
      return null
  }
}
