import { getEncoding } from 'js-tiktoken'

// Use cl100k_base encoding (used by OpenAI embeddings, good general-purpose counter)
const encoder = getEncoding('cl100k_base')

export function countTokens(text: string): number {
  return encoder.encode(text).length
}
