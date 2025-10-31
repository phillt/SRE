import { Manifest } from '../../core/contracts/manifest.js'
import { Span } from '../../core/contracts/span.js'
import { NodeMap, SectionNode } from '../../core/contracts/node-map.js'
import { BuildReport } from '../../core/contracts/report.js'
import { SearchResult } from '../../core/contracts/search-hit.js'
import { LoadedArtifacts } from '../loader/load-artifacts.js'
import {
  LexicalIndex,
  tokenize,
  FuzzyOptions,
} from '../search/lexical-index.js'
import { TFIDFRanker } from '../search/rank-tfidf.js'
import { SemanticRanker } from '../search/rank-semantic.js'
import { HybridRanker } from '../search/rank-hybrid.js'
import {
  RetrievalOptions,
  RetrievalPack,
  RetrievalPackEntry,
} from '../../core/contracts/retrieval-pack.js'
import {
  expandToNeighbors,
  expandToSection,
  createPack,
  ExpandedContext,
} from '../retrieval/expand.js'
import { dedupeAndMerge } from '../retrieval/merge-dedupe.js'
import { applyBudget } from '../retrieval/budget.js'
import {
  AssembledPrompt,
  PromptStyle,
  CitationStyle,
} from '../../core/contracts/rag-prompt.js'
import { assemblePrompt as assemblePromptCore } from '../rag/assemble-prompt.js'

/**
 * Options for the neighbors() method
 */
export interface NeighborsOptions {
  before?: number
  after?: number
}

/**
 * Options for hybrid ranking
 */
export interface HybridOptions {
  weightLexical?: number
  weightSemantic?: number
  normalize?: boolean
}

/**
 * Options for the search() method
 */
export interface SearchOptions {
  limit?: number
  rank?: 'none' | 'tfidf' | 'hybrid'
  fuzzy?: FuzzyOptions
  hybrid?: HybridOptions
}

/**
 * Options for the assemblePrompt() method
 */
export interface AssemblePromptOptionsReader {
  question: string
  packs: RetrievalPack[]
  headroomTokens?: number
  style?: PromptStyle
  citationStyle?: CitationStyle
}

/**
 * Internal search result with score information
 */
interface ScoredSpan {
  span: Span
  score: number
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
  private searchIndex?: LexicalIndex // Lazy-initialized on first search
  private tfidfRanker?: TFIDFRanker // Lazy-initialized with search index
  private semanticRanker?: SemanticRanker // Lazy-initialized for hybrid ranking
  private hybridRanker?: HybridRanker // Lazy-initialized for hybrid ranking

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
    this.orderedSpans = [...artifacts.spans].sort(
      (a, b) => a.meta.order - b.meta.order
    )

    // Build orderToId index
    this.orderToId = new Map()
    for (const span of this.orderedSpans) {
      this.orderToId.set(span.meta.order, span.id)
    }

    // Build section index if nodeMap exists
    if (this.nodeMap) {
      this.sectionIndex = new Map()
      for (const [sectionId, section] of Object.entries(
        this.nodeMap.sections
      )) {
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
    for (
      let i = targetOrder + 1;
      i <= Math.min(maxOrder, targetOrder + after);
      i++
    ) {
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

  /**
   * Search for spans containing query terms and/or phrases.
   *
   * Supports:
   * - Exact token matching (case-insensitive, punctuation-stripped)
   * - Quoted phrase matching (e.g., "error handling")
   * - Mixed queries (tokens + phrases)
   * - Optional fuzzy matching for typo tolerance (edit distance 1)
   *
   * Uses AND logic for all terms (tokens and phrases must all match).
   *
   * The search index is built lazily on first search() call.
   *
   * Results include hit annotations:
   * - Token hits: which query tokens matched (with fuzzy flag if applicable)
   * - Phrase hits: which phrases matched with character offsets
   *
   * Fuzzy matching (if enabled):
   * - Applies only to rare tokens (df < threshold) that are long enough
   * - Phrases always use exact match
   * - Fuzzy-only hits receive a small ranking penalty
   *
   * Ranking modes:
   * - 'none': Document order (default)
   * - 'tfidf': TF-IDF relevance with phrase boosting and fuzzy penalty
   * - 'hybrid': Fuses TF-IDF (lexical) and cosine similarity (semantic) scores
   *
   * Hybrid ranking (if enabled):
   * - Combines lexical (TF-IDF) and semantic (embedding cosine) signals
   * - Default weights: 0.7 lexical, 0.3 semantic
   * - Helps find semantically similar content even with different wording
   * - Compatible with fuzzy matching (fuzzy affects lexical scores)
   *
   * Results are sorted by relevance score (descending) when ranking is enabled,
   * with ties broken by document order.
   *
   * @param query - Search query (supports "quoted phrases" and tokens)
   * @param options - Search options (limit, rank, fuzzy, hybrid)
   * @returns Array of search results with hit annotations
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    // Build indexes lazily on first call
    if (!this.searchIndex) {
      this.searchIndex = new LexicalIndex(this.orderedSpans)
    }

    // Build ranker lazily if ranking is requested
    if (
      (options?.rank === 'tfidf' || options?.rank === 'hybrid') &&
      !this.tfidfRanker
    ) {
      this.tfidfRanker = new TFIDFRanker(this.searchIndex, this.orderedSpans)
    }

    // Build semantic/hybrid rankers lazily if hybrid ranking is requested
    if (options?.rank === 'hybrid') {
      if (!this.semanticRanker) {
        this.semanticRanker = new SemanticRanker(this.orderedSpans)
      }
      if (!this.hybridRanker && this.tfidfRanker) {
        this.hybridRanker = new HybridRanker(
          this.tfidfRanker,
          this.semanticRanker
        )
      }
    }

    // Don't apply limit at search stage if ranking - need all results to rank properly
    const limitAtSearch =
      options?.rank === 'tfidf' || options?.rank === 'hybrid'
        ? undefined
        : options?.limit

    // Get matching results with hit annotations
    let results = this.searchIndex.searchWithHits(
      query,
      limitAtSearch,
      options?.fuzzy
    )

    // Apply ranking if requested
    if (options?.rank === 'tfidf' && this.tfidfRanker) {
      const queryTokens = tokenize(query)
      const rankedResults = this.tfidfRanker.rankWithHits(
        results,
        queryTokens,
        0.1
      )

      // Sort by score descending, then by document order for ties
      rankedResults.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // Tie-breaker: document order
        return a.order - b.order
      })

      results = rankedResults

      // Apply limit after ranking
      if (options?.limit !== undefined) {
        results = results.slice(0, options.limit)
      }
    } else if (
      options?.rank === 'hybrid' &&
      this.hybridRanker &&
      this.semanticRanker
    ) {
      const queryTokens = tokenize(query)
      const queryEmbedding = this.semanticRanker.embedQuery(query)

      const rankedResults = this.hybridRanker.rankWithHits(
        results,
        queryTokens,
        queryEmbedding,
        options.hybrid
      )

      // Sort by score descending, then by document order for ties
      rankedResults.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // Tie-breaker: document order
        return a.order - b.order
      })

      results = rankedResults

      // Apply limit after ranking
      if (options?.limit !== undefined) {
        results = results.slice(0, options.limit)
      }
    } else {
      // No ranking - sort by document order
      results.sort((a, b) => a.order - b.order)
    }

    return results
  }

  /**
   * Enable optional TF caching for TF-IDF ranking.
   *
   * Trades memory for speed by caching computed TF vectors.
   * Useful when repeatedly searching/ranking a corpus with overlapping result sets.
   *
   * Must be called before search() calls that use ranking.
   * If search index/ranker don't exist yet, they will be built.
   *
   * @param cacheSize - Maximum number of TF vectors to cache (default: 100)
   */
  enableTfCache(cacheSize: number = 100): void {
    // Build indexes lazily if not already built
    if (!this.searchIndex) {
      this.searchIndex = new LexicalIndex(this.orderedSpans)
    }
    if (!this.tfidfRanker) {
      this.tfidfRanker = new TFIDFRanker(this.searchIndex, this.orderedSpans)
    }

    // Enable cache on ranker
    this.tfidfRanker.enableCache(cacheSize)
  }

  /**
   * Search and return spans with relevance scores and hit annotations.
   * Internal method used by retrieve().
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Array of scored spans with hit annotations
   */
  private searchWithScores(
    query: string,
    options?: SearchOptions
  ): Array<{ result: SearchResult; span: Span }> {
    // Get search results with hit annotations
    const searchResults = this.search(query, options)

    // Map results to spans
    return searchResults
      .map((result) => {
        const span = this.spansById.get(result.id)
        if (!span) return null
        return { result, span }
      })
      .filter(
        (item): item is { result: SearchResult; span: Span } => item !== null
      )
  }

  /**
   * Build index mapping paragraph IDs to section IDs.
   * Used for section-based expansion.
   *
   * @returns Map from span ID to section ID
   */
  private buildParagraphToSectionIndex(): Map<string, string> {
    const index = new Map<string, string>()
    if (this.nodeMap) {
      for (const [spanId, paragraph] of Object.entries(
        this.nodeMap.paragraphs
      )) {
        index.set(spanId, paragraph.sectionId)
      }
    }
    return index
  }

  /**
   * Expand a single search hit to a context window.
   *
   * @param entry - Search hit entry
   * @param expandMode - Expansion mode ('neighbors' or 'section')
   * @param perHitNeighbors - Number of neighbors for neighbor expansion
   * @param paragraphsIndex - Index for section lookup
   * @returns Expanded context
   */
  private expandHit(
    entry: RetrievalPackEntry,
    expandMode: 'neighbors' | 'section',
    perHitNeighbors: number,
    paragraphsIndex: Map<string, string>
  ): ExpandedContext {
    const maxOrder = this.orderedSpans.length - 1

    // Try section expansion if requested
    if (expandMode === 'section' && this.nodeMap) {
      const sectionContext = expandToSection(
        entry,
        this.nodeMap,
        paragraphsIndex
      )
      if (sectionContext) {
        return sectionContext
      }
      // Fallback to neighbors if section not found
    }

    // Neighbors expansion (or fallback)
    return expandToNeighbors(entry, perHitNeighbors, this.orderToId, maxOrder)
  }

  /**
   * Retrieve context packs for a query.
   *
   * Transforms ranked search hits into LLM-ready context blocks by:
   * 1. Running search to get candidate hits
   * 2. Expanding each hit to neighbors or full section
   * 3. Merging and deduping overlapping contexts
   * 4. Ranking packs by relevance
   * 5. Applying budget constraints
   *
   * @param query - Search query
   * @param options - Retrieval options
   * @returns Array of retrieval packs
   */
  retrieve(query: string, options: RetrievalOptions = {}): RetrievalPack[] {
    const {
      limit = 5,
      perHitNeighbors = 1,
      expand = 'neighbors',
      maxTokens,
      rank = 'tfidf',
    } = options

    // Step 1: Search with expanded candidate limit
    const searchResults = this.searchWithScores(query, {
      rank,
      limit: limit * 4,
    })

    if (searchResults.length === 0) {
      return []
    }

    // Step 2: Build indexes for expansion
    const paragraphsIndex = this.buildParagraphToSectionIndex()

    // Step 3: Expand each hit
    const expandedContexts = searchResults.map(({ result, span }) => {
      const entry: RetrievalPackEntry = {
        spanId: span.id,
        order: span.meta.order,
        score: result.score,
        headingPath: span.meta.headingPath,
        hits: result.hits,
      }
      return this.expandHit(entry, expand, perHitNeighbors, paragraphsIndex)
    })

    // Step 4: Merge and dedupe
    const mergedContexts = dedupeAndMerge(expandedContexts)

    // Step 5: Create packs
    const packs = mergedContexts.map((ctx) => createPack(ctx, this.spansById))

    // Step 6: Sort by score desc, then order asc
    packs.sort((a, b) => {
      if (b.entry.score !== a.entry.score) {
        return b.entry.score - a.entry.score
      }
      return a.entry.order - b.entry.order
    })

    // Step 7: Apply budget
    return applyBudget(packs, limit, maxTokens)
  }

  /**
   * Assemble a prompt from retrieval packs with citations.
   *
   * Converts ranked retrieval packs into a structured prompt ready for LLM consumption.
   * Includes:
   * - System instructions based on style (qa/summarize)
   * - User question with context blocks
   * - Numeric citation markers ([¹], [²], etc.)
   * - Citation metadata mapping markers to sources
   * - Final budget check with headroom (default 300 tokens)
   *
   * The function applies a final safety check using headroomTokens to ensure
   * the prompt doesn't exceed budget. If packs would overflow the budget,
   * the lowest-scoring packs are dropped deterministically.
   *
   * @param options - Assembly options
   * @returns Assembled prompt with citations
   */
  assemblePrompt(options: AssemblePromptOptionsReader): AssembledPrompt {
    return assemblePromptCore({
      ...options,
      docId: this.manifest.id,
    })
  }
}
