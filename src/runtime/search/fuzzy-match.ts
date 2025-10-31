/**
 * Fuzzy matching utilities for typo-tolerant search.
 *
 * Implements Levenshtein edit distance 1 matching by generating
 * all possible single-edit variations (insert, delete, substitute)
 * and intersecting with the corpus vocabulary.
 */

/**
 * Generate all possible strings within edit distance 1 of the input token.
 *
 * Edit operations:
 * - Insert: Add a character at any position
 * - Delete: Remove a character at any position
 * - Substitute: Replace a character at any position
 *
 * Uses lowercase letters (a-z) and digits (0-9) as the alphabet.
 * Generates candidates deterministically (same token → same order).
 *
 * @param token - Input token (should be lowercase, alphanumeric)
 * @returns Array of all 1-edit variations (may contain duplicates)
 */
export function generateOneEditNeighborhood(token: string): string[] {
  const candidates: string[] = []
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'

  // Delete: remove each character
  for (let i = 0; i < token.length; i++) {
    candidates.push(token.slice(0, i) + token.slice(i + 1))
  }

  // Substitute: replace each character with each letter/digit
  for (let i = 0; i < token.length; i++) {
    for (const char of alphabet) {
      if (char !== token[i]) {
        candidates.push(token.slice(0, i) + char + token.slice(i + 1))
      }
    }
  }

  // Insert: add each letter/digit at each position (including ends)
  for (let i = 0; i <= token.length; i++) {
    for (const char of alphabet) {
      candidates.push(token.slice(0, i) + char + token.slice(i))
    }
  }

  return candidates
}

/**
 * Find fuzzy candidate tokens that exist in the corpus vocabulary.
 *
 * Generates 1-edit neighborhood and intersects with vocabulary.
 * Returns up to maxCandidates valid tokens, sorted for determinism.
 *
 * Deterministic behavior:
 * - Same token + vocabulary → same candidates in same order
 * - Candidates sorted alphabetically before truncating
 *
 * @param token - Query token to find fuzzy matches for
 * @param vocabulary - Set of all tokens in the corpus
 * @param maxCandidates - Maximum number of candidates to return
 * @returns Array of fuzzy candidate tokens (sorted, up to maxCandidates)
 */
export function findFuzzyCandidates(
  token: string,
  vocabulary: Set<string>,
  maxCandidates: number
): string[] {
  // Generate all 1-edit variations
  const neighborhood = generateOneEditNeighborhood(token)

  // Filter to only tokens that exist in vocabulary
  // Use Set to deduplicate (some edits produce same result)
  const validCandidates = new Set<string>()
  for (const candidate of neighborhood) {
    if (vocabulary.has(candidate)) {
      validCandidates.add(candidate)
    }
  }

  // Convert to array and sort for determinism
  const sorted = Array.from(validCandidates).sort()

  // Apply max candidates limit
  return sorted.slice(0, maxCandidates)
}
