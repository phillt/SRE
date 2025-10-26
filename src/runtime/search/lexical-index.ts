import { Span } from '../../core/contracts/span.js'

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
    .replace(/[^a-z0-9]+/g, ' ')  // Replace non-alphanumeric with spaces
    .split(/\s+/)                  // Split on whitespace
    .filter(token => token.length > 0)  // Remove empty strings
}

/**
 * Lexical search index for exact token matching.
 *
 * Builds an inverted index mapping tokens to span IDs.
 * Supports case-insensitive exact token matching with AND logic for multi-word queries.
 */
export class LexicalIndex {
  private readonly index: Map<string, Set<string>>

  /**
   * Build search index from spans.
   *
   * @param spans - Array of spans to index
   */
  constructor(spans: Span[]) {
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
    const spanSets = queryTokens.map(token => this.index.get(token) || new Set<string>())

    // Intersect sets (AND logic for multi-word queries)
    let matchingSpans = new Set(spanSets[0])

    for (let i = 1; i < spanSets.length; i++) {
      matchingSpans = new Set([...matchingSpans].filter(id => spanSets[i].has(id)))
    }

    // Convert to array
    const results = Array.from(matchingSpans)

    // Apply limit if specified
    return limit !== undefined ? results.slice(0, limit) : results
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
}
