import { Span } from '../../core/contracts/span.js'
import { NodeMap } from '../../core/contracts/node-map.js'
import {
  RetrievalPack,
  RetrievalPackEntry,
  RetrievalPackScope,
} from '../../core/contracts/retrieval-pack.js'

/**
 * Result of expanding a hit to a context window
 */
export interface ExpandedContext {
  packId: string
  entry: RetrievalPackEntry
  scope: RetrievalPackScope
  paragraphIds: string[]
  headingPath: string[]
}

/**
 * Expand a search hit to include neighboring spans.
 * Returns a context window of ±perHitNeighbors around the target span.
 *
 * @param entry - The search hit (span with score)
 * @param perHitNeighbors - Number of neighbors before and after
 * @param orderToId - Map from order to span ID
 * @param maxOrder - Maximum order value in corpus
 * @returns Expanded context with neighbors
 */
export function expandToNeighbors(
  entry: RetrievalPackEntry,
  perHitNeighbors: number,
  orderToId: Map<number, string>,
  maxOrder: number
): ExpandedContext {
  const { order } = entry

  // Calculate range bounds
  const start = Math.max(0, order - perHitNeighbors)
  const end = Math.min(maxOrder, order + perHitNeighbors)

  // Collect span IDs in document order
  const paragraphIds: string[] = []
  for (let i = start; i <= end; i++) {
    const spanId = orderToId.get(i)
    if (spanId) {
      paragraphIds.push(spanId)
    }
  }

  // Generate deterministic pack ID: o:<start>-<end>
  const packId = `o:${start}-${end}`

  return {
    packId,
    entry,
    scope: {
      type: 'neighbors',
      range: { start, end },
    },
    paragraphIds,
    headingPath: entry.headingPath,
  }
}

/**
 * Expand a search hit to include its entire section.
 * Returns all paragraphs in the section containing the target span.
 *
 * @param entry - The search hit (span with score)
 * @param nodeMap - Node map with section structure
 * @param paragraphsIndex - Map from span ID to section ID
 * @returns Expanded context with full section, or null if section not found
 */
export function expandToSection(
  entry: RetrievalPackEntry,
  nodeMap: NodeMap,
  paragraphsIndex: Map<string, string>
): ExpandedContext | null {
  // Find the section ID for this span
  const sectionId = paragraphsIndex.get(entry.spanId)
  if (!sectionId) {
    return null
  }

  // Get section data
  const section = nodeMap.sections[sectionId]
  if (!section) {
    return null
  }

  // Get heading path from section heading
  // Section heading is the full path like "## Section Two" or "# Chapter One"
  const heading = section.meta.heading
  const headingPath = parseHeadingPath(heading)

  // Generate deterministic pack ID: s:<sectionId>
  const packId = `s:${sectionId}`

  return {
    packId,
    entry,
    scope: {
      type: 'section',
      sectionId,
    },
    paragraphIds: [...section.paragraphIds],
    headingPath,
  }
}

/**
 * Parse a markdown heading into a heading path array.
 * Handles nested headings by extracting just the text.
 *
 * Examples:
 * - "# Chapter One" → ["Chapter One"]
 * - "## Section Two" → ["Section Two"]
 * - "" (synthetic section) → []
 *
 * @param heading - Markdown heading string
 * @returns Array of heading components
 */
function parseHeadingPath(heading: string): string[] {
  if (!heading || heading.trim() === '') {
    return []
  }

  // Remove markdown heading syntax (# ## ###)
  const text = heading.replace(/^#+\s*/, '').trim()

  if (text === '') {
    return []
  }

  // For now, return as single-element array
  // In the future, this could be enhanced to parse hierarchical paths
  return [text]
}

/**
 * Assemble a RetrievalPack from expanded context and span data.
 *
 * @param context - Expanded context with paragraph IDs
 * @param spansById - Map from span ID to Span
 * @returns Complete RetrievalPack ready for consumption
 */
export function createPack(
  context: ExpandedContext,
  spansById: Map<string, Span>
): RetrievalPack {
  // Collect spans in document order (paragraphIds are already ordered)
  const spans: Span[] = []
  for (const spanId of context.paragraphIds) {
    const span = spansById.get(spanId)
    if (span) {
      spans.push(span)
    }
  }

  // Join span texts with double newline
  const text = spans.map((s) => s.text).join('\n\n')

  // Calculate metadata
  const charCount = text.length
  const spanCount = spans.length

  return {
    packId: context.packId,
    entry: context.entry,
    scope: context.scope,
    paragraphIds: context.paragraphIds,
    text,
    meta: {
      headingPath: context.headingPath,
      spanCount,
      charCount,
    },
  }
}