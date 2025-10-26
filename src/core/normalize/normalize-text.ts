/**
 * Normalize text for consistent processing.
 * - Applies Unicode NFC normalization for consistency
 * - Converts \r\n to \n (normalize line endings)
 * - Trims leading/trailing whitespace
 * - Collapses multiple blank lines to one
 *
 * This is a pure function with no side effects.
 */
export function normalizeText(rawText: string): string {
  // Apply Unicode NFC normalization for consistency across platforms
  let normalized = rawText.normalize('NFC')

  // Normalize line endings (Windows CRLF → Unix LF)
  normalized = normalized.replace(/\r\n/g, '\n')

  // Trim leading/trailing whitespace
  normalized = normalized.trim()

  // Collapse multiple blank lines to one (three or more consecutive newlines → two newlines)
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  return normalized
}
