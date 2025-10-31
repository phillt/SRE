import { RetrievalPack } from '../../core/contracts/retrieval-pack.js'

/**
 * Apply budget constraints to retrieval packs.
 *
 * Enforces two limits:
 * 1. Maximum number of packs (limit)
 * 2. Maximum total characters (maxTokens - used as character proxy)
 *
 * Uses hard limit strategy: stops before adding a pack that would exceed budget.
 * Ensures at least the constraints are respected strictly.
 *
 * Packs should already be sorted in desired order before calling this function.
 *
 * @param packs - Sorted array of retrieval packs
 * @param limit - Maximum number of packs (optional)
 * @param maxTokens - Maximum total characters across all packs (optional)
 * @returns Array of packs that fit within budget
 */
export function applyBudget(
  packs: RetrievalPack[],
  limit?: number,
  maxTokens?: number
): RetrievalPack[] {
  const result: RetrievalPack[] = []
  let totalChars = 0

  for (const pack of packs) {
    // Check limit constraint
    if (limit !== undefined && result.length >= limit) {
      break
    }

    // Check maxTokens constraint (hard limit - stop before exceeding)
    if (maxTokens !== undefined) {
      if (totalChars + pack.meta.charCount > maxTokens) {
        // Adding this pack would exceed budget, stop here
        break
      }
    }

    // Pack fits within budget
    result.push(pack)
    totalChars += pack.meta.charCount
  }

  return result
}
