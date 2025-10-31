/**
 * Phrase search utilities for parsing queries and matching phrases in text.
 *
 * Supports quoted phrase extraction and exact phrase matching with character offsets.
 */

/**
 * Parsed query with separate phrases and tokens
 */
export interface ParsedQuery {
  phrases: string[]
  tokens: string[]
}

/**
 * Character range for a phrase match
 */
export interface PhraseMatchRange {
  start: number
  end: number
}

/**
 * Parse a search query into phrases (quoted strings) and tokens.
 *
 * Phrases are extracted from double-quoted strings.
 * Remaining text is tokenized using the same rules as lexical search.
 *
 * Examples:
 * - '"error handling" retries' → phrases: ["error handling"], tokens: ["retries"]
 * - '"policy names" "error messages"' → phrases: ["policy names", "error messages"], tokens: []
 * - 'simple query' → phrases: [], tokens: ["simple", "query"]
 *
 * @param query - Search query string
 * @returns Parsed query with phrases and tokens
 */
export function parseQuery(query: string): ParsedQuery {
  const phrases: string[] = []
  let remaining = query

  // Extract quoted phrases
  const phraseRegex = /"([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = phraseRegex.exec(query)) !== null) {
    phrases.push(match[1])
  }

  // Remove quoted phrases from query to get remaining tokens
  remaining = query.replace(phraseRegex, ' ')

  // Tokenize remaining text (same logic as lexical-index.ts tokenize())
  const tokens = remaining
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)

  return { phrases, tokens }
}

/**
 * Normalize a phrase for matching.
 *
 * Applies same normalization as tokenize() but preserves spaces between words.
 * This ensures phrase matching uses the same rules as token matching.
 *
 * Rules:
 * 1. Lowercase
 * 2. Strip punctuation (replace with spaces)
 * 3. Collapse multiple spaces to single space
 * 4. Trim leading/trailing spaces
 *
 * Examples:
 * - "Error Handling" → "error handling"
 * - "**bold** text" → "bold text"
 * - "Here's a link" → "here s a link"
 *
 * @param phrase - Phrase to normalize
 * @returns Normalized phrase
 */
export function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim() // Remove leading/trailing spaces
}

/**
 * Find all non-overlapping occurrences of a phrase in text.
 *
 * Uses leftmost-first strategy for overlapping matches.
 * Both phrase and text are normalized before matching.
 *
 * Returns character offsets relative to the normalized text.
 *
 * @param text - Text to search in (will be normalized)
 * @param phrase - Phrase to search for (will be normalized)
 * @returns Array of character ranges for matches (sorted by start position)
 */
export function findPhraseMatches(
  text: string,
  phrase: string
): PhraseMatchRange[] {
  const normalizedText = normalizePhrase(text)
  const normalizedPhrase = normalizePhrase(phrase)

  if (normalizedPhrase.length === 0) {
    return []
  }

  const ranges: PhraseMatchRange[] = []
  let searchStart = 0

  while (true) {
    const index = normalizedText.indexOf(normalizedPhrase, searchStart)
    if (index === -1) {
      break
    }

    ranges.push({
      start: index,
      end: index + normalizedPhrase.length,
    })

    // Move past this match (non-overlapping)
    searchStart = index + normalizedPhrase.length
  }

  return ranges
}

/**
 * Check if text contains all required phrases.
 *
 * Uses AND logic - text must contain every phrase at least once.
 *
 * @param text - Text to search in
 * @param phrases - Array of phrases that must all be present
 * @returns True if all phrases are found
 */
export function containsAllPhrases(text: string, phrases: string[]): boolean {
  const normalizedText = normalizePhrase(text)

  for (const phrase of phrases) {
    const normalizedPhrase = normalizePhrase(phrase)
    if (!normalizedText.includes(normalizedPhrase)) {
      return false
    }
  }

  return true
}
