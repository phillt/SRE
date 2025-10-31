import { Span } from '../../core/contracts/span.js'
import { SearchResult } from '../../core/contracts/search-hit.js'
import {
  parseQuery,
  findPhraseMatches,
  containsAllPhrases,
} from './phrase-search.js'

/**
 * Tokenize text into searchable tokens.
 *
 * Rules:
 * 1. Lowercase
 * 2. Strip markdown and punctuation (keep only alphanumeric)
 * 3. Split on whitespace
 * 4. Remove empty strings
 *
 * Examples:
 * - "## Section Two" → ["section", "two"]
 * - "**bold** text" → ["bold", "text"]
 * - "Here's a link" → ["here", "s", "a", "link"]
 *
 * @param text - Text to tokenize
 * @returns Array of lowercase alphanumeric tokens
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // Replace non-alphanumeric with spaces
    .split(/\s+/) // Split on whitespace
    .filter((token) => token.length > 0) // Remove empty strings
}

/**
 * Lexical search index for exact token matching.
 *
 * Builds an inverted index mapping tokens to span IDs.
 * Supports case-insensitive exact token matching with AND logic for multi-word queries.
 */
export class LexicalIndex {
  private readonly index: Map<string, Set<string>>
  private readonly spans: Span[]

  /**
   * Build search index from spans.
   *
   * @param spans - Array of spans to index
   */
  constructor(spans: Span[]) {
    this.spans = spans
    this.index = new Map()

    // Build inverted index
    for (const span of spans) {
      const tokens = tokenize(span.text)

      for (const token of tokens) {
        if (!this.index.has(token)) {
          this.index.set(token, new Set())
        }
        this.index.get(token)!.add(span.id)
      }
    }
  }

  /**
   * Search for spans matching query.
   *
   * Uses exact token matching (case-insensitive).
   * Multi-word queries use AND logic (all terms must match).
   *
   * @param query - Search query (one or more words)
   * @param limit - Maximum number of results (optional)
   * @returns Array of matching span IDs
   */
  search(query: string, limit?: number): string[] {
    // Tokenize query
    const queryTokens = tokenize(query)

    if (queryTokens.length === 0) {
      return []
    }

    // Get span ID sets for each token
    const spanSets = queryTokens.map(
      (token) => this.index.get(token) || new Set<string>()
    )

    // Intersect sets (AND logic for multi-word queries)
    let matchingSpans = new Set(spanSets[0])

    for (let i = 1; i < spanSets.length; i++) {
      matchingSpans = new Set(
        [...matchingSpans].filter((id) => spanSets[i].has(id))
      )
    }

    // Convert to array
    const results = Array.from(matchingSpans)

    // Apply limit if specified
    return limit !== undefined ? results.slice(0, limit) : results
  }

  /**
   * Search for spans matching query with hit annotations.
   *
   * Supports both tokens and quoted phrases.
   * Uses AND logic for both tokens and phrases (all must match).
   *
   * Returns results with hit annotations including:
   * - Token hits: which query tokens matched
   * - Phrase hits: which phrases matched with character offsets
   *
   * @param query - Search query (supports "quoted phrases" and tokens)
   * @param limit - Maximum number of results (optional)
   * @returns Array of search results with hit annotations
   */
  searchWithHits(query: string, limit?: number): SearchResult[] {
    // Parse query into phrases and tokens
    const parsed = parseQuery(query)

    // If no phrases and no tokens, return empty
    if (parsed.phrases.length === 0 && parsed.tokens.length === 0) {
      return []
    }

    // Get candidate spans using token-based search
    let candidateIds: string[]

    if (parsed.tokens.length > 0) {
      // Use existing token logic to get candidates
      candidateIds = this.search(parsed.tokens.join(' '))
    } else {
      // No tokens, but we have phrases - need to check all spans
      // Use a cheap prefilter: get spans containing first word of first phrase
      const firstPhrase = parsed.phrases[0]
      const firstWord = tokenize(firstPhrase)[0]
      if (firstWord) {
        candidateIds = Array.from(this.index.get(firstWord) || new Set())
      } else {
        candidateIds = []
      }
    }

    // Build span ID to Span map for quick lookup
    const spansById = new Map<string, Span>()
    for (const span of this.spans) {
      spansById.set(span.id, span)
    }

    // Filter candidates by phrase requirements and collect hits
    const results: SearchResult[] = []

    for (const spanId of candidateIds) {
      const span = spansById.get(spanId)
      if (!span) continue

      // Check if span contains all required phrases
      if (parsed.phrases.length > 0) {
        if (!containsAllPhrases(span.text, parsed.phrases)) {
          continue // Skip spans that don't have all phrases
        }
      }

      // Collect token hits (which tokens from query matched)
      const tokenHits = parsed.tokens.map((term) => ({ term }))

      // Collect phrase hits with ranges
      const phraseHits = parsed.phrases.map((phrase) => ({
        phrase,
        ranges: findPhraseMatches(span.text, phrase),
      }))

      results.push({
        id: span.id,
        order: span.meta.order,
        score: 0, // Score will be set by ranker if used
        hits: {
          tokens: tokenHits,
          phrases: phraseHits,
        },
      })

      // Apply limit if specified
      if (limit !== undefined && results.length >= limit) {
        break
      }
    }

    return results
  }

  /**
   * Get index statistics for debugging.
   *
   * @returns Object with vocabulary size and total token occurrences
   */
  getStats(): { vocabularySize: number; totalTokenOccurrences: number } {
    let totalOccurrences = 0
    for (const spanIds of this.index.values()) {
      totalOccurrences += spanIds.size
    }

    return {
      vocabularySize: this.index.size,
      totalTokenOccurrences: totalOccurrences,
    }
  }

  /**
   * Get document frequency for a token.
   *
   * Document frequency is the number of spans containing the token.
   * Used for computing IDF (Inverse Document Frequency) in ranking.
   *
   * @param token - Token to look up (should be pre-tokenized)
   * @returns Number of documents (spans) containing the token
   */
  getDocumentFrequency(token: string): number {
    return this.index.get(token)?.size ?? 0
  }

  /**
   * Get total number of documents (spans) in the corpus.
   *
   * Used for computing IDF (Inverse Document Frequency) in ranking.
   *
   * @returns Total number of spans in the index
   */
  getTotalDocuments(): number {
    return this.spans.length
  }
}
