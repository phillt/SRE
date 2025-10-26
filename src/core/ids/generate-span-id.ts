/**
 * Generate a stable, sequential span ID.
 * Format: span:NNNNNN (zero-padded to 6 digits)
 *
 * @param order - The zero-based order of the span
 * @returns A formatted span ID
 */
export function generateSpanId(order: number): string {
  return `span:${String(order + 1).padStart(6, '0')}`
}
