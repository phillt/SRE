import { ExpandedContext } from './expand.js'

/**
 * Merged context represents multiple hits that expanded to the same pack.
 * Keeps the highest-scoring entry and unions all paragraph IDs.
 */
export interface MergedContext {
  packId: string
  entry: ExpandedContext['entry']
  scope: ExpandedContext['scope']
  paragraphIds: string[]
  headingPath: string[]
}

/**
 * Merge overlapping or identical expanded contexts.
 *
 * When multiple search hits expand to the same packId:
 * - Keep the entry with the highest score
 * - Union all paragraphIds (preserve document order, no duplicates)
 * - Preserve the heading path from the highest-scoring entry
 *
 * @param contexts - Array of expanded contexts to merge
 * @returns Array of merged contexts (one per unique packId)
 */
export function dedupeAndMerge(
  contexts: ExpandedContext[]
): MergedContext[] {
  // Group contexts by packId
  const grouped = new Map<string, ExpandedContext[]>()

  for (const context of contexts) {
    const existing = grouped.get(context.packId) || []
    existing.push(context)
    grouped.set(context.packId, existing)
  }

  // Merge each group
  const merged: MergedContext[] = []

  for (const [packId, group] of grouped.entries()) {
    if (group.length === 0) continue

    // Find entry with highest score
    let bestEntry = group[0].entry
    for (const ctx of group) {
      if (ctx.entry.score > bestEntry.score) {
        bestEntry = ctx.entry
      } else if (
        ctx.entry.score === bestEntry.score &&
        ctx.entry.order < bestEntry.order
      ) {
        // Tie-breaker: use earlier document order
        bestEntry = ctx.entry
      }
    }

    // Union all paragraph IDs (preserve document order, no duplicates)
    const paragraphIds = unionParagraphIds(group.map((g) => g.paragraphIds))

    // Use heading path from best entry's context
    const bestContext = group.find((g) => g.entry === bestEntry)!

    merged.push({
      packId,
      entry: bestEntry,
      scope: bestContext.scope,
      paragraphIds,
      headingPath: bestContext.headingPath,
    })
  }

  return merged
}

/**
 * Union multiple arrays of paragraph IDs.
 * Preserves document order and removes duplicates.
 *
 * @param arrays - Arrays of paragraph IDs to union
 * @returns Single array with all unique IDs in document order
 */
function unionParagraphIds(arrays: string[][]): string[] {
  // Collect all IDs with their first occurrence order
  const seen = new Set<string>()
  const result: string[] = []

  // Process arrays in order to maintain document order
  // For overlapping spans, we want to preserve the natural flow
  const allIds: Array<{ id: string; index: number }> = []

  for (const array of arrays) {
    for (let i = 0; i < array.length; i++) {
      const id = array[i]
      if (!seen.has(id)) {
        // Extract order from span ID (assumes format "span:NNNNNN")
        const orderMatch = id.match(/span:(\d+)/)
        const order = orderMatch ? parseInt(orderMatch[1], 10) : 0

        allIds.push({ id, index: order })
        seen.add(id)
      }
    }
  }

  // Sort by document order (extracted from span ID)
  allIds.sort((a, b) => a.index - b.index)

  return allIds.map((item) => item.id)
}