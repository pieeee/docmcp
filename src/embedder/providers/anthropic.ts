import type { EmbeddingProvider, InputType } from '../types.js'

const BATCH_SIZE = 96 // Voyage API limit

/**
 * Anthropic provider uses Voyage AI for embeddings
 * Voyage is Anthropic's recommended embedding partner
 * Uses the provided API key (can be Voyage API key or compatible key)
 */
export class AnthropicProvider implements EmbeddingProvider {
  readonly name = 'anthropic'
  readonly dimensions = 1024
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async embed(text: string, inputType: InputType = 'document'): Promise<Float32Array> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'voyage-3',
        input: [text],
        input_type: inputType,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Voyage API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>
    }

    const embedding = data.data[0]?.embedding
    if (!embedding) {
      throw new Error('No embedding returned from Voyage')
    }

    return new Float32Array(embedding)
  }

  async embedBatch(texts: string[], inputType: InputType = 'document'): Promise<Float32Array[]> {
    const results: Float32Array[] = []

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)

      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'voyage-3',
          input: batch,
          input_type: inputType,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Voyage API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>
      }

      for (const item of data.data) {
        results.push(new Float32Array(item.embedding))
      }
    }

    return results
  }
}
