import { Span } from '../../core/contracts/span.js'
import { SearchResult } from '../../core/contracts/search-hit.js'
import { TFIDFRanker } from './rank-tfidf.js'
import { SemanticRanker } from './rank-semantic.js'

/**
 * Options for hybrid ranking
 */
export interface HybridOptions {
  /** Weight for lexical (TF-IDF) signal (default: 0.7) */
  weightLexical?: number
  /** Weight for semantic (cosine) signal (default: 0.3) */
  weightSemantic?: number
  /** Enable min-max normalization (default: true) */
  normalize?: boolean
}

/**
 * Hybrid ranker that fuses lexical (TF-IDF) and semantic (cosine) signals
 *
 * Algorithm:
 * 1. Compute TF-IDF scores for candidate spans
 * 2. Compute cosine similarity scores for candidate spans
 * 3. Normalize both score sets to [0,1] range (min-max)
 * 4. Weighted fusion: score = (tfidf_norm × w_lex) + (cosine_norm × w_sem)
 * 5. Sort by combined score descending
 *
 * Default weights: 0.7 lexical, 0.3 semantic
 * This preserves precision while adding semantic recall for paraphrased queries.
 */
export class HybridRanker {
  private readonly tfidfRanker: TFIDFRanker
  private readonly semanticRanker: SemanticRanker

  /**
   * Create hybrid ranker
   *
   * @param tfidfRanker - TF-IDF ranker instance
   * @param semanticRanker - Semantic ranker instance
   */
  constructor(tfidfRanker: TFIDFRanker, semanticRanker: SemanticRanker) {
    this.tfidfRanker = tfidfRanker
    this.semanticRanker = semanticRanker
  }

  /**
   * Normalize scores to [0, 1] range using min-max normalization
   *
   * If all scores are equal (or only one score), returns all 1.0.
   * This handles edge cases like single results or identical scores.
   *
   * @param scores - Map of span ID to raw score
   * @returns Map of span ID to normalized score in [0, 1]
   */
  private normalizeScores(scores: Map<string, number>): Map<string, number> {
    if (scores.size === 0) {
      return new Map()
    }

    const values = Array.from(scores.values())
    const min = Math.min(...values)
    const max = Math.max(...values)

    // If all scores equal, return all 1.0
    if (max === min) {
      const normalized = new Map<string, number>()
      for (const [id] of scores) {
        normalized.set(id, 1.0)
      }
      return normalized
    }

    // Min-max normalization: (x - min) / (max - min)
    const normalized = new Map<string, number>()
    for (const [id, score] of scores) {
      normalized.set(id, (score - min) / (max - min))
    }

    return normalized
  }

  /**
   * Rank search results using hybrid fusion of TF-IDF and semantic scores
   *
   * Applies same phrase boost and fuzzy penalty as TF-IDF ranker,
   * then fuses with semantic similarity scores.
   *
   * @param results - Search results with hit annotations
   * @param queryTokens - Pre-tokenized query terms
   * @param queryEmbedding - Query embedding vector (128-d)
   * @param options - Hybrid ranking options
   * @returns Array of search results with updated hybrid scores
   */
  rankWithHits(
    results: SearchResult[],
    queryTokens: string[],
    queryEmbedding: number[],
    options: HybridOptions = {}
  ): SearchResult[] {
    const {
      weightLexical = 0.7,
      weightSemantic = 0.3,
      normalize = true,
    } = options

    // Validate weights
    if (weightLexical < 0 || weightSemantic < 0) {
      throw new Error('Weights must be non-negative')
    }
    if (weightLexical + weightSemantic > 1.0) {
      throw new Error('Weight sum cannot exceed 1.0')
    }

    // If no results, return empty
    if (results.length === 0) {
      return []
    }

    // Step 1: Get TF-IDF scores (with phrase boost and fuzzy penalty)
    const tfidfResults = this.tfidfRanker.rankWithHits(
      results,
      queryTokens,
      0.1
    )
    const tfidfScores = new Map<string, number>()
    for (const result of tfidfResults) {
      tfidfScores.set(result.id, result.score)
    }

    // Step 2: Get semantic similarity scores
    const spanIds = results.map((r) => r.id)
    const semanticScores = this.semanticRanker.scoreByCosineSimilarity(
      spanIds,
      queryEmbedding
    )

    // Step 3: Normalize scores to [0, 1] if requested
    let tfidfNormalized: Map<string, number>
    let semanticNormalized: Map<string, number>

    if (normalize) {
      tfidfNormalized = this.normalizeScores(tfidfScores)
      semanticNormalized = this.normalizeScores(semanticScores)
    } else {
      tfidfNormalized = tfidfScores
      semanticNormalized = semanticScores
    }

    // Step 4: Fuse scores with weighted combination
    const hybridScores: SearchResult[] = []

    for (const result of results) {
      const tfidf = tfidfNormalized.get(result.id) ?? 0
      const semantic = semanticNormalized.get(result.id) ?? 0

      const hybridScore = tfidf * weightLexical + semantic * weightSemantic

      hybridScores.push({
        ...result,
        score: hybridScore,
      })
    }

    return hybridScores
  }
}
