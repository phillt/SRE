import { z } from 'zod'

// Zod schema for a span
export const SpanSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  meta: z.object({
    order: z.number().int().min(0),
  }),
})

export type Span = z.infer<typeof SpanSchema>

/**
 * Split normalized text into paragraph spans
 * - Splits on two or more newlines (paragraph boundaries)
 * - Trims each paragraph and drops empties
 * - Assigns sequential IDs (span:000001, span:000002, ...)
 * - Adds order metadata
 * - Validates each span with zod
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
      id: `span:${String(order + 1).padStart(6, '0')}`,
      text: trimmed,
      meta: {
        order,
      },
    }

    // Validate with zod
    SpanSchema.parse(span)

    spans.push(span)
    order++
  }

  return spans
}
