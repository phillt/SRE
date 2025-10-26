import * as crypto from 'crypto'

/**
 * Generate a SHA-256 hash of the given content.
 * Used for content addressability and change detection.
 */
export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}
