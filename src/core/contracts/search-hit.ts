import { z } from 'zod'

/**
 * A token that matched in the search query
 */
export const TokenHitSchema = z.object({
  term: z.string(),
})

export type TokenHit = z.infer<typeof TokenHitSchema>

/**
 * A phrase match with character positions in the span text
 */
export const PhraseHitSchema = z.object({
  phrase: z.string(),
  ranges: z.array(
    z.object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    })
  ),
})

export type PhraseHit = z.infer<typeof PhraseHitSchema>

/**
 * Collection of all hits (tokens and phrases) for a search result
 */
export const SearchHitsSchema = z.object({
  tokens: z.array(TokenHitSchema),
  phrases: z.array(PhraseHitSchema),
})

export type SearchHits = z.infer<typeof SearchHitsSchema>

/**
 * A search result with hit annotations
 * Extends the basic span info with score and hit positions
 */
export const SearchResultSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  score: z.number(),
  hits: SearchHitsSchema,
})

export type SearchResult = z.infer<typeof SearchResultSchema>
