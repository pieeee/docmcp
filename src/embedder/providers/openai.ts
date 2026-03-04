import OpenAI from 'openai'
import type { EmbeddingProvider, InputType } from '../types.js'

const BATCH_SIZE = 100 // OpenAI limit

export class OpenAIProvider implements EmbeddingProvider {
  readonly name = 'openai'
  readonly dimensions = 1536
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async embed(text: string, _inputType?: InputType): Promise<Float32Array> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI')
    }

    return new Float32Array(embedding)
  }

  async embedBatch(texts: string[], _inputType?: InputType): Promise<Float32Array[]> {
    const results: Float32Array[] = []

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      })

      for (const data of response.data) {
        results.push(new Float32Array(data.embedding))
      }
    }

    return results
  }
}
