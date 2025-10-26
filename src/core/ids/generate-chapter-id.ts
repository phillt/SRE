/**
 * Generate a sequential chapter ID.
 * Format: chap:NNNNNN (e.g., chap:000001, chap:000002)
 *
 * This is a pure function with no side effects.
 *
 * @param order - Zero-based chapter order (0, 1, 2, ...)
 * @returns Formatted chapter ID string
 */
export function generateChapterId(order: number): string {
  // Add 1 to order since IDs start at 1
  return `chap:${String(order + 1).padStart(6, '0')}`
}
