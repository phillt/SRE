import { Span } from '../../core/contracts/span.js'
import { cosineSimilarity, embedText } from '../../core/embed/mini-embedder.js'

/**
 * Semantic ranker using cosine similarity between embeddings
 *
 * Computes relevance scores based on semantic similarity between
 * query and document embeddings (128-d vectors).
 *
 * Uses pre-computed span embeddings from artifacts.
 * Query embeddings are computed on demand.
 */
export class SemanticRanker {
  private readonly spansById: Map<string, Span>

  /**
   * Create semantic ranker
   *
   * @param spans - Array of spans with embeddings
   */
  constructor(spans: Span[]) {
    this.spansById = new Map(spans.map((s) => [s.id, s]))
  }

  /**
   * Score spans by cosine similarity to query
   *
   * Returns similarity scores in range [-1, 1], where:
   * - 1.0 = most similar (identical semantic direction)
   * - 0.0 = unrelated (orthogonal)
   * - -1.0 = opposite semantic direction
   *
   * Spans without embeddings are skipped with a warning.
   *
   * @param spanIds - Array of span IDs to score
   * @param queryEmbedding - Query embedding vector (128-d)
   * @returns Map from span ID to cosine similarity score
   */
  scoreByCosineSimilarity(
    spanIds: string[],
    queryEmbedding: number[]
  ): Map<string, number> {
    const scores = new Map<string, number>()

    for (const spanId of spanIds) {
      const span = this.spansById.get(spanId)
      if (!span) continue

      // Skip spans without embeddings
      if (!span.embedding || span.embedding.length === 0) {
        console.warn(
          `Span ${spanId} missing embedding, skipping semantic scoring`
        )
        continue
      }

      // Compute cosine similarity
      const similarity = cosineSimilarity(queryEmbedding, span.embedding)
      scores.set(spanId, similarity)
    }

    return scores
  }

  /**
   * Embed query text using same algorithm as spans
   *
   * @param query - Query text
   * @returns 128-d embedding vector
   */
  embedQuery(query: string): number[] {
    return embedText(query)
  }
}
