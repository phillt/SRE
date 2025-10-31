import { Span } from '../../core/contracts/span.js'
import { SearchResult } from '../../core/contracts/search-hit.js'
import { LexicalIndex, tokenize } from './lexical-index.js'

/**
 * Simple LRU (Least Recently Used) cache implementation.
 *
 * Evicts oldest entry when capacity is exceeded.
 * Used to cache TF computations for frequently searched spans.
 */
class LRUCache<K, V> {
  private cache: Map<K, V>
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get value from cache, marking it as recently used.
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  /**
   * Set value in cache, evicting oldest if over capacity.
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // Remove if exists (to reorder)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // Add to end
    this.cache.set(key, value)
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear()
  }
}

/**
 * Cached TF data including both term frequencies and document length.
 * Caching both avoids re-tokenizing the same span during ranking.
 */
interface TFData {
  tfMap: Map<string, number>
  docLength: number
}

/**
 * TF-IDF relevance ranker for search results.
 *
 * Computes relevance scores using:
 * - TF (Term Frequency): 1 + log(count) for log-normalized frequency
 * - IDF (Inverse Document Frequency): log(N / (1 + df)) from global index
 * - Length normalization: score / sqrt(doc_length)
 *
 * Hybrid caching strategy:
 * - DF (Document Frequency): Cached globally in inverted index
 * - TF (Term Frequency): Computed per query, optionally cached with LRU
 * - Document length: Cached alongside TF to avoid re-tokenizing
 */
export class TFIDFRanker {
  private readonly index: LexicalIndex
  private readonly spansById: Map<string, Span>
  private tfCache?: LRUCache<string, TFData>

  /**
   * Create TF-IDF ranker.
   *
   * @param index - Lexical index providing DF statistics
   * @param spans - Array of spans for TF computation
   */
  constructor(index: LexicalIndex, spans: Span[]) {
    this.index = index
    this.spansById = new Map(spans.map((s) => [s.id, s]))
  }

  /**
   * Enable optional TF caching with LRU eviction.
   *
   * Trades memory for speed by caching computed TF vectors.
   * Useful when same spans are repeatedly ranked across queries.
   *
   * @param cacheSize - Maximum number of TF vectors to cache (default: 100)
   */
  enableCache(cacheSize: number = 100): void {
    this.tfCache = new LRUCache(cacheSize)
  }

  /**
   * Rank spans by TF-IDF relevance to query.
   *
   * @param spanIds - Array of span IDs to rank
   * @param queryTokens - Pre-tokenized query terms
   * @returns Array of {id, score} sorted by score descending
   */
  rank(
    spanIds: string[],
    queryTokens: string[]
  ): Array<{ id: string; score: number }> {
    const totalDocs = this.index.getTotalDocuments()

    // Compute IDF for each query token (global, from postings)
    const idfMap = new Map<string, number>()
    for (const token of queryTokens) {
      const df = this.index.getDocumentFrequency(token)
      const idf = Math.log(totalDocs / (1 + df))
      idfMap.set(token, idf)
    }

    // Score each span
    const scored: Array<{ id: string; score: number }> = []

    for (const spanId of spanIds) {
      const span = this.spansById.get(spanId)
      if (!span) continue

      // Check cache for TF data
      let tfData = this.tfCache?.get(spanId)

      if (!tfData) {
        // Compute TF and document length for this span
        tfData = this.computeTF(span)
        // Cache if enabled
        this.tfCache?.set(spanId, tfData)
      }

      // Compute TF-IDF score
      let score = 0
      for (const token of queryTokens) {
        const tf = tfData.tfMap.get(token) ?? 0
        const idf = idfMap.get(token) ?? 0
        score += tf * idf
      }

      // Length normalization: divide by sqrt(doc_length)
      score = score / Math.sqrt(tfData.docLength)

      scored.push({ id: spanId, score })
    }

    return scored
  }

  /**
   * Rank search results with phrase boosting.
   *
   * Computes TF-IDF scores and adds a small boost for phrase matches.
   * Phrase boost: +0.1 per distinct phrase (capped at +0.3).
   *
   * @param results - Search results with hit annotations
   * @param queryTokens - Pre-tokenized query terms
   * @param phraseBoost - Boost per phrase (default: 0.1)
   * @returns Array of search results with updated scores
   */
  rankWithHits(
    results: SearchResult[],
    queryTokens: string[],
    phraseBoost: number = 0.1
  ): SearchResult[] {
    const totalDocs = this.index.getTotalDocuments()

    // Compute IDF for each query token (global, from postings)
    const idfMap = new Map<string, number>()
    for (const token of queryTokens) {
      const df = this.index.getDocumentFrequency(token)
      const idf = Math.log(totalDocs / (1 + df))
      idfMap.set(token, idf)
    }

    // Score each result
    const scored: SearchResult[] = []

    for (const result of results) {
      const span = this.spansById.get(result.id)
      if (!span) continue

      // Check cache for TF data
      let tfData = this.tfCache?.get(result.id)

      if (!tfData) {
        // Compute TF and document length for this span
        tfData = this.computeTF(span)
        // Cache if enabled
        this.tfCache?.set(result.id, tfData)
      }

      // Compute TF-IDF score
      let score = 0
      for (const token of queryTokens) {
        const tf = tfData.tfMap.get(token) ?? 0
        const idf = idfMap.get(token) ?? 0
        score += tf * idf
      }

      // Length normalization: divide by sqrt(doc_length)
      score = score / Math.sqrt(tfData.docLength)

      // Add phrase boost (capped at 0.3)
      const phraseCount = result.hits.phrases.length
      const boost = Math.min(0.3, phraseCount * phraseBoost)
      score += boost

      scored.push({
        ...result,
        score,
      })
    }

    return scored
  }

  /**
   * Compute log-normalized TF and document length for a span.
   *
   * TF = 1 + log(count) for each token.
   * Dampens effect of high-frequency terms.
   *
   * Computes document length during tokenization to avoid re-tokenizing.
   *
   * @param span - Span to compute TF for
   * @returns TF data with term frequencies and document length
   */
  private computeTF(span: Span): TFData {
    const tokens = tokenize(span.text)
    const termCounts = new Map<string, number>()

    // Count occurrences
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) ?? 0) + 1)
    }

    // Apply log normalization: 1 + log(count)
    const tfMap = new Map<string, number>()
    for (const [token, count] of termCounts) {
      tfMap.set(token, 1 + Math.log(count))
    }

    return {
      tfMap,
      docLength: tokens.length,
    }
  }
}
