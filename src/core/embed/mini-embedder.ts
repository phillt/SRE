/**
 * Minimal local embedder for semantic similarity
 *
 * Implements lightweight 128-dimensional embeddings using deterministic
 * hash-based projection. Zero external dependencies, fully reproducible.
 *
 * Algorithm:
 * 1. Tokenize text (case-insensitive, alphanumeric)
 * 2. For each token, generate 128-d vector via deterministic hash projection
 * 3. Average all token vectors
 * 4. Normalize to unit length (for cosine similarity)
 *
 * This provides basic semantic similarity that captures term co-occurrence
 * patterns without requiring training data or external models.
 */

const EMBEDDING_DIM = 128

/**
 * Pre-allocated zero vector for empty text
 * Returned as a slice to prevent mutation of the constant
 */
const ZERO_VECTOR = new Array(EMBEDDING_DIM).fill(0)

/**
 * Simple deterministic hash function
 * Maps string + dimension index to a value in [-1, 1]
 *
 * @param str - String to hash
 * @param dim - Dimension index (0-127)
 * @returns Hash value in range [-1, 1]
 */
function deterministicHash(str: string, dim: number): number {
  let hash = 0
  const combined = `${str}:${dim}`

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Map to [-1, 1] range
  return (hash % 10000) / 5000 - 1
}

/**
 * Generate 128-d embedding vector for a single token
 *
 * @param token - Pre-tokenized term (lowercase alphanumeric)
 * @returns 128-d vector representing the token
 */
function embedToken(token: string): number[] {
  const vec = new Array(EMBEDDING_DIM)
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec[i] = deterministicHash(token, i)
  }
  return vec
}

/**
 * Tokenize text into searchable tokens (same as lexical search)
 *
 * Rules:
 * 1. Lowercase
 * 2. Strip markdown and punctuation (keep only alphanumeric)
 * 3. Split on whitespace
 * 4. Remove empty strings
 *
 * @param text - Text to tokenize
 * @returns Array of lowercase alphanumeric tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

/**
 * Normalize vector to unit length
 *
 * @param vec - Vector to normalize
 * @returns Unit-length vector (or zero vector if input is zero)
 */
function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0))

  if (magnitude === 0) {
    return vec.map(() => 0)
  }

  return vec.map((val) => val / magnitude)
}

/**
 * Generate 128-d embedding for text
 *
 * Algorithm:
 * 1. Tokenize text
 * 2. Generate vector for each token
 * 3. Average all token vectors
 * 4. Normalize to unit length
 *
 * Empty text returns zero vector.
 * Deterministic: same text always produces same embedding.
 *
 * @param text - Text to embed
 * @returns 128-d unit vector representing text semantics
 */
export function embedText(text: string): number[] {
  const tokens = tokenize(text)

  if (tokens.length === 0) {
    return ZERO_VECTOR.slice()
  }

  // Initialize accumulator
  const sumVec = new Array(EMBEDDING_DIM).fill(0)

  // Sum token vectors
  for (const token of tokens) {
    const tokenVec = embedToken(token)
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      sumVec[i] += tokenVec[i]
    }
  }

  // Average
  const avgVec = sumVec.map((val) => val / tokens.length)

  // Normalize to unit length
  return normalizeVector(avgVec)
}

/**
 * Compute cosine similarity between two embedding vectors
 *
 * Assumes vectors are already unit-normalized.
 * Result is in range [-1, 1], where:
 * - 1.0 = identical direction (most similar)
 * - 0.0 = orthogonal (unrelated)
 * - -1.0 = opposite direction (least similar)
 *
 * @param vec1 - First embedding vector
 * @param vec2 - Second embedding vector
 * @returns Cosine similarity in [-1, 1]
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(
      `Vector dimension mismatch: ${vec1.length} vs ${vec2.length}`
    )
  }

  let dotProduct = 0
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
  }

  return dotProduct
}

/**
 * Get embedding dimensionality
 *
 * @returns Embedding dimension (128)
 */
export function getEmbeddingDim(): number {
  return EMBEDDING_DIM
}
