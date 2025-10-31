import { z } from 'zod'
import { RetrievalPackSchema } from './retrieval-pack.js'

/**
 * Prompt assembly style
 */
export const PromptStyleSchema = z.enum(['qa', 'summarize'])

export type PromptStyle = z.infer<typeof PromptStyleSchema>

/**
 * Options for assembling prompts from retrieval packs
 */
export const AssemblePromptOptionsSchema = z.object({
  question: z.string(),
  packs: z.array(RetrievalPackSchema),
  docId: z.string(),
  style: PromptStyleSchema.optional(),
})

export type AssemblePromptOptions = z.infer<typeof AssemblePromptOptionsSchema>

/**
 * Citation entry mapping markers to pack metadata
 */
export const CitationEntrySchema = z.object({
  marker: z.string(),
  packId: z.string(),
  docId: z.string(),
  headingPath: z.array(z.string()),
  spanOffsets: z.array(z.tuple([z.number(), z.number()])).optional(),
})

export type CitationEntry = z.infer<typeof CitationEntrySchema>

/**
 * Structured prompt with system and user messages
 */
export const PromptMessagesSchema = z.object({
  system: z.string(),
  user: z.string(),
})

export type PromptMessages = z.infer<typeof PromptMessagesSchema>

/**
 * Assembled prompt ready for LLM consumption
 */
export const AssembledPromptSchema = z.object({
  prompt: PromptMessagesSchema,
  citations: z.array(CitationEntrySchema),
  tokensEstimated: z.number().int().nonnegative(),
})

export type AssembledPrompt = z.infer<typeof AssembledPromptSchema>
