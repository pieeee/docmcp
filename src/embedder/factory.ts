import type { Config } from '../config/config.js'
import type { EmbeddingProvider } from './types.js'
import { AnthropicProvider } from './providers/anthropic.js'
import { OpenAIProvider } from './providers/openai.js'
import { BM25OnlyProvider } from './providers/bm25only.js'

export async function newProvider(config: Config): Promise<EmbeddingProvider> {
  const { provider, apiKey } = config.embedding

  switch (provider) {
    case 'anthropic': {
      if (!apiKey) {
        throw new Error(
          'Anthropic provider requires ANTHROPIC_API_KEY or VOYAGE_API_KEY environment variable'
        )
      }
      return new AnthropicProvider(apiKey)
    }

    case 'openai': {
      if (!apiKey) {
        throw new Error('OpenAI provider requires OPENAI_API_KEY environment variable')
      }
      return new OpenAIProvider(apiKey)
    }

    case 'voyage': {
      // Voyage uses same implementation as Anthropic (just different key)
      if (!apiKey) {
        throw new Error('Voyage provider requires VOYAGE_API_KEY environment variable')
      }
      return new AnthropicProvider(apiKey)
    }

    case 'local': {
      // Local ONNX provider not implemented in MVP
      throw new Error(
        'Local ONNX provider is not yet implemented. ' +
          'Please use anthropic, openai, or bm25only provider.'
      )
    }

    case 'bm25only':
    default:
      return new BM25OnlyProvider()
  }
}
