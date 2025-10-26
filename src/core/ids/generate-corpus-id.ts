/**
 * Generate a content-addressable corpus ID from the source hash.
 * Same content = same ID, regardless of file location.
 *
 * @param sourceHash - SHA-256 hash of normalized text
 * @returns A corpus ID prefixed with "corpus:" (e.g., "corpus:904f64c3578a")
 */
export function generateCorpusId(sourceHash: string): string {
  // Use first 12 characters of hash for brevity while maintaining uniqueness
  const shortHash = sourceHash.substring(0, 12)
  return `corpus:${shortHash}`
}
