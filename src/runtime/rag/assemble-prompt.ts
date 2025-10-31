import {
  AssemblePromptOptions,
  AssembledPrompt,
  CitationEntry,
  PromptStyle,
  CitationStyle,
} from '../../core/contracts/rag-prompt.js'
import { RetrievalPack } from '../../core/contracts/retrieval-pack.js'

/**
 * Unicode superscript digits for numeric citations
 */
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']

/**
 * Convert a number to superscript citation marker
 * @param num - Citation number (1-indexed)
 * @returns Superscript marker like [¹], [²], etc.
 */
function toSuperscriptMarker(num: number): string {
  const digits = num.toString().split('')
  const superscript = digits
    .map((d) => SUPERSCRIPT_DIGITS[parseInt(d)])
    .join('')
  return `[${superscript}]`
}

/**
 * Get system prompt for the specified style
 */
function getSystemPrompt(style: PromptStyle): string {
  if (style === 'qa') {
    return (
      'You are a helpful assistant that answers questions based on provided context. ' +
      'Only provide information that is directly supported by the context. ' +
      'Cite your sources using the numbered markers provided (e.g., [¹], [²]). ' +
      'If the context does not contain sufficient information to answer the question, ' +
      'say so clearly rather than making assumptions.'
    )
  } else {
    // summarize
    return (
      'You are a helpful assistant that summarizes information from provided context. ' +
      'Create a concise, accurate summary based only on the information in the context. ' +
      'Cite your sources using the numbered markers provided (e.g., [¹], [²]). ' +
      'Do not add information that is not present in the context.'
    )
  }
}

/**
 * Format a single context block with citation marker
 */
function formatContextBlock(
  pack: RetrievalPack,
  marker: string,
  docId: string
): string {
  const lines: string[] = []

  // Citation marker
  lines.push(marker)

  // Document ID
  lines.push(`Doc: ${docId}`)

  // Heading path (if present)
  if (pack.meta.headingPath.length > 0) {
    const path = pack.meta.headingPath.join(' > ')
    lines.push(`Path: ${path}`)
  }

  // Separator
  lines.push('---')

  // Text content
  lines.push(pack.text)

  return lines.join('\n')
}

/**
 * Extract span offsets from pack hits if available
 */
function extractSpanOffsets(
  pack: RetrievalPack
): Array<[number, number]> | undefined {
  if (!pack.entry.hits) {
    return undefined
  }

  const offsets: Array<[number, number]> = []

  // Collect phrase hit ranges
  for (const phrase of pack.entry.hits.phrases) {
    for (const range of phrase.ranges) {
      offsets.push([range.start, range.end])
    }
  }

  return offsets.length > 0 ? offsets : undefined
}

/**
 * Estimate tokens from character count (simple heuristic: chars = tokens)
 */
function estimateTokens(text: string): number {
  return text.length
}

/**
 * Assemble a prompt from retrieval packs with citations
 *
 * Converts ranked retrieval packs into a structured prompt ready for LLM consumption.
 * Includes:
 * - System instructions based on style (qa/summarize)
 * - User question
 * - Context blocks with numeric citations
 * - Citation metadata mapping markers to sources
 * - Final budget check with headroom
 *
 * @param options - Assembly options
 * @returns Assembled prompt with citations
 */
export function assemblePrompt(
  options: AssemblePromptOptions
): AssembledPrompt {
  const {
    question,
    packs,
    docId,
    headroomTokens = 300,
    style = 'qa',
    citationStyle = 'numeric',
  } = options

  // Handle empty packs
  if (packs.length === 0) {
    const systemPrompt = getSystemPrompt(style)
    const userPrompt = question

    return {
      prompt: {
        system: systemPrompt,
        user: userPrompt,
      },
      citations: [],
      tokensEstimated: estimateTokens(systemPrompt + userPrompt),
    }
  }

  // Packs are already sorted by score (desc), order (asc) from retrieve()
  // We'll process them in order and apply budget constraints

  // Build system prompt
  const systemPrompt = getSystemPrompt(style)

  // Build citations and context blocks with budget awareness
  const citations: CitationEntry[] = []
  const contextBlocks: string[] = []
  let totalChars = 0

  // Estimate base prompt size
  const baseUserPrompt = `${question}\n\nYou may reference the following context:`
  const baseSize = estimateTokens(systemPrompt) + estimateTokens(baseUserPrompt)

  // Reserve headroom
  const availableTokens = Number.MAX_SAFE_INTEGER // No maxTokens constraint from retrieve()
  const budgetLimit = availableTokens - headroomTokens

  // Process packs in order, applying budget
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i]
    const marker = toSuperscriptMarker(i + 1)

    // Format context block
    const contextBlock = formatContextBlock(pack, marker, docId)
    const blockSize = estimateTokens(contextBlock)

    // Check if adding this block would exceed budget
    const projectedTotal = baseSize + totalChars + blockSize

    if (projectedTotal > budgetLimit) {
      // Stop here - don't add this pack or any remaining ones
      break
    }

    // Add to context
    contextBlocks.push(contextBlock)
    totalChars += blockSize

    // Build citation entry
    const citation: CitationEntry = {
      marker,
      packId: pack.packId,
      docId,
      headingPath: pack.meta.headingPath,
      spanOffsets: extractSpanOffsets(pack),
    }
    citations.push(citation)
  }

  // Build user prompt with context
  const markerList = citations.map((c) => c.marker).join('…')
  const userPrompt =
    contextBlocks.length > 0
      ? `${question}\n\nYou may reference ${markerList}.\n\n` +
        contextBlocks.join('\n\n')
      : question

  // Calculate total estimated tokens
  const tokensEstimated =
    estimateTokens(systemPrompt) + estimateTokens(userPrompt)

  return {
    prompt: {
      system: systemPrompt,
      user: userPrompt,
    },
    citations,
    tokensEstimated,
  }
}
