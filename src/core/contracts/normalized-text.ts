import { z } from 'zod'

/**
 * NormalizedText represents text that has been processed for consistency
 * with a content hash for identity verification.
 */
export const NormalizedTextSchema = z.object({
  text: z.string(),
  sourceHash: z.string(),
})

export type NormalizedText = z.infer<typeof NormalizedTextSchema>
