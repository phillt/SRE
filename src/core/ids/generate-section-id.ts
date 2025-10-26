/**
 * Generate a sequential section ID.
 * Format: sec:NNNNNN (e.g., sec:000001, sec:000002)
 *
 * This is a pure function with no side effects.
 *
 * @param order - Zero-based section order (0, 1, 2, ...)
 * @returns Formatted section ID string
 */
export function generateSectionId(order: number): string {
  // Add 1 to order since IDs start at 1
  return `sec:${String(order + 1).padStart(6, '0')}`
}
