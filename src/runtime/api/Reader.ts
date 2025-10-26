import { Manifest } from '../../core/contracts/manifest.js'
import { Span } from '../../core/contracts/span.js'
import { NodeMap, SectionNode } from '../../core/contracts/node-map.js'
import { BuildReport } from '../../core/contracts/report.js'
import { LoadedArtifacts } from '../loader/load-artifacts.js'

/**
 * Options for the neighbors() method
 */
export interface NeighborsOptions {
  before?: number
  after?: number
}

/**
 * Reader provides read-only access to loaded span artifacts.
 * Builds efficient in-memory indexes for fast queries.
 *
 * All methods are synchronous after construction.
 * No mutations - purely read-only.
 */
export class Reader {
  private readonly manifest: Manifest
  private readonly nodeMap?: NodeMap
  private readonly buildReport?: BuildReport

  // Indexes for efficient access
  private readonly spansById: Map<string, Span>
  private readonly orderedSpans: Span[]
  private readonly orderToId: Map<number, string>
  private readonly sectionIndex?: Map<string, string[]>

  /**
   * Construct a Reader from loaded artifacts.
   * Builds all indexes eagerly.
   *
   * @param artifacts - Loaded artifacts from loadArtifacts()
   */
  constructor(artifacts: LoadedArtifacts) {
    this.manifest = artifacts.manifest
    this.nodeMap = artifacts.nodeMap
    this.buildReport = artifacts.buildReport

    // Build spansById index
    this.spansById = new Map()
    for (const span of artifacts.spans) {
      this.spansById.set(span.id, span)
    }

    // Build ordered spans (sorted by meta.order)
    this.orderedSpans = [...artifacts.spans].sort((a, b) => a.meta.order - b.meta.order)

    // Build orderToId index
    this.orderToId = new Map()
    for (const span of this.orderedSpans) {
      this.orderToId.set(span.meta.order, span.id)
    }

    // Build section index if nodeMap exists
    if (this.nodeMap) {
      this.sectionIndex = new Map()
      for (const [sectionId, section] of Object.entries(this.nodeMap.sections)) {
        this.sectionIndex.set(sectionId, section.paragraphIds)
      }
    }
  }

  /**
   * Get the manifest metadata.
   *
   * @returns The manifest
   */
  getManifest(): Manifest {
    return this.manifest
  }

  /**
   * Get a span by its ID.
   *
   * @param id - Span ID (e.g., "span:000001")
   * @returns The span, or undefined if not found
   */
  getSpan(id: string): Span | undefined {
    return this.spansById.get(id)
  }

  /**
   * Get the total number of spans.
   *
   * @returns Span count
   */
  getSpanCount(): number {
    return this.spansById.size
  }

  /**
   * Get a span by its order (0-indexed position in document).
   *
   * @param order - Zero-based order
   * @returns The span at that order, or undefined if out of range
   */
  getByOrder(order: number): Span | undefined {
    const id = this.orderToId.get(order)
    if (!id) return undefined
    return this.spansById.get(id)
  }

  /**
   * Get neighboring span IDs around a given span.
   * Returns IDs in document order: [before..., id, ...after]
   *
   * Handles boundaries gracefully - returns fewer IDs if at document edges.
   *
   * @param id - Target span ID
   * @param options - How many neighbors before and after (default: {before: 1, after: 1})
   * @returns Array of span IDs including the target, in order
   */
  neighbors(id: string, options: NeighborsOptions = {}): string[] {
    const { before = 1, after = 1 } = options

    // Find the target span
    const targetSpan = this.spansById.get(id)
    if (!targetSpan) {
      return []
    }

    const targetOrder = targetSpan.meta.order
    const result: string[] = []

    // Collect spans before
    for (let i = Math.max(0, targetOrder - before); i < targetOrder; i++) {
      const spanId = this.orderToId.get(i)
      if (spanId) {
        result.push(spanId)
      }
    }

    // Add target span
    result.push(id)

    // Collect spans after
    const maxOrder = this.orderedSpans.length - 1
    for (let i = targetOrder + 1; i <= Math.min(maxOrder, targetOrder + after); i++) {
      const spanId = this.orderToId.get(i)
      if (spanId) {
        result.push(spanId)
      }
    }

    return result
  }

  /**
   * Get section data by section ID.
   * Only available if nodeMap exists.
   *
   * @param sectionId - Section ID (e.g., "sec:000001")
   * @returns Section data with paragraph IDs, or undefined if not found or no nodeMap
   */
  getSection(sectionId: string): { paragraphIds: string[] } | undefined {
    if (!this.nodeMap) {
      return undefined
    }

    const section = this.nodeMap.sections[sectionId]
    if (!section) {
      return undefined
    }

    return {
      paragraphIds: section.paragraphIds,
    }
  }

  /**
   * List all section IDs in the document.
   * Returns empty array if nodeMap doesn't exist.
   *
   * @returns Array of section IDs, sorted for determinism
   */
  listSections(): string[] {
    if (!this.nodeMap) {
      return []
    }

    return Object.keys(this.nodeMap.sections).sort()
  }

  /**
   * Get the node map if it exists.
   * Useful for advanced navigation.
   *
   * @returns NodeMap or undefined
   */
  getNodeMap(): NodeMap | undefined {
    return this.nodeMap
  }

  /**
   * Get the build report if it exists.
   * Useful for quality metrics.
   *
   * @returns BuildReport or undefined
   */
  getBuildReport(): BuildReport | undefined {
    return this.buildReport
  }
}
