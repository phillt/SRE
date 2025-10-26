import { z } from 'zod'

/**
 * Span represents a single unit of text (e.g., a paragraph) with metadata.
 * This is the core data structure for segmented text.
 */
export const SpanSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  meta: z.object({
    order: z.number().int().min(0),
  }),
})

export type Span = z.infer<typeof SpanSchema>
