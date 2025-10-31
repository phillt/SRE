import { z } from 'zod'

/**
 * Options for the retrieve() method
 */
export const RetrievalOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  perHitNeighbors: z.number().int().min(0).optional(),
  expand: z.enum(['neighbors', 'section']).optional(),
  maxTokens: z.number().int().positive().optional(),
  rank: z.enum(['none', 'tfidf']).optional(),
})

export type RetrievalOptions = z.infer<typeof RetrievalOptionsSchema>

/**
 * Entry span that triggered this retrieval pack
 * Contains the search hit metadata
 */
export const RetrievalPackEntrySchema = z.object({
  spanId: z.string(),
  order: z.number().int().min(0),
  score: z.number(),
  headingPath: z.array(z.string()),
})

export type RetrievalPackEntry = z.infer<typeof RetrievalPackEntrySchema>

/**
 * Scope information describing how the pack was expanded
 */
export const RetrievalPackScopeSchema = z.object({
  type: z.enum(['neighbors', 'section']),
  sectionId: z.string().optional(),
  range: z
    .object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    })
    .optional(),
})

export type RetrievalPackScope = z.infer<typeof RetrievalPackScopeSchema>

/**
 * Metadata about the pack contents
 */
export const RetrievalPackMetaSchema = z.object({
  headingPath: z.array(z.string()),
  spanCount: z.number().int().min(1),
  charCount: z.number().int().min(1),
})

export type RetrievalPackMeta = z.infer<typeof RetrievalPackMetaSchema>

/**
 * A retrieval pack is a context block ready for LLM consumption.
 * It contains one or more related paragraphs (spans) with metadata.
 */
export const RetrievalPackSchema = z.object({
  packId: z.string(),
  entry: RetrievalPackEntrySchema,
  scope: RetrievalPackScopeSchema,
  paragraphIds: z.array(z.string()).min(1),
  text: z.string().min(1),
  meta: RetrievalPackMetaSchema,
})

export type RetrievalPack = z.infer<typeof RetrievalPackSchema>