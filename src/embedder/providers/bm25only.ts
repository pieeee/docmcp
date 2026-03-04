import type { EmbeddingProvider, InputType } from '../types.js'

export class BM25OnlyProvider implements EmbeddingProvider {
  readonly name = 'bm25only'
  readonly dimensions = null

  async embed(_text: string, _inputType?: InputType): Promise<null> {
    return null
  }

  async embedBatch(texts: string[], _inputType?: InputType): Promise<null[]> {
    return texts.map(() => null)
  }
}
