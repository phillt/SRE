import { Span, SpanSchema } from '../contracts/span.js'
import { generateSpanId } from '../ids/generate-span-id.js'

/**
 * Split normalized text into paragraph spans.
 * - Splits on two or more newlines (paragraph boundaries)
 * - Trims each paragraph and drops empties
 * - Assigns sequential IDs and order metadata
 * - Validates each span with Zod
 *
 * This is a pure function with no side effects.
 */
export function splitIntoParagraphs(normalizedText: string): Span[] {
  // Split on two or more newlines
  const rawParagraphs = normalizedText.split(/\n{2,}/)

  const spans: Span[] = []
  let order = 0

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim()

    // Drop empty paragraphs
    if (trimmed.length === 0) {
      continue
    }

    // Create span with sequential ID
    const span: Span = {
      id: generateSpanId(order),
      text: trimmed,
      meta: {
        order,
      },
    }

    // Validate with Zod
    SpanSchema.parse(span)

    spans.push(span)
    order++
  }

  return spans
}
