export type InputType = 'document' | 'query'

export interface EmbeddingProvider {
  readonly name: string
  readonly dimensions: number | null

  /**
   * Embed a single text string
   * @param text - The text to embed
   * @param inputType - Whether this is a document (for indexing) or query (for search)
   * @returns The embedding vector, or null for BM25-only provider
   */
  embed(text: string, inputType?: InputType): Promise<Float32Array | null>

  /**
   * Embed multiple texts in a batch
   * @param texts - The texts to embed
   * @param inputType - Whether these are documents or queries
   * @returns Array of embedding vectors (or nulls for BM25-only)
   */
  embedBatch(texts: string[], inputType?: InputType): Promise<(Float32Array | null)[]>
}
