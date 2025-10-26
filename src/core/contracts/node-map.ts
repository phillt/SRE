import { z } from 'zod'

/**
 * Book node - root of the document hierarchy
 */
export const BookNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
})

export type BookNode = z.infer<typeof BookNodeSchema>

/**
 * Chapter node - corresponds to H1 headings
 * Contains references to sections
 */
export const ChapterNodeSchema = z.object({
  sectionIds: z.array(z.string()),
  meta: z.object({}), // Reserved for future chapter metadata
})

export type ChapterNode = z.infer<typeof ChapterNodeSchema>

/**
 * Section node - corresponds to H2 headings
 * Contains references to paragraph spans
 */
export const SectionNodeSchema = z.object({
  paragraphIds: z.array(z.string()),
  meta: z.object({
    heading: z.string(), // H1/H2 text with markdown syntax, or '' for synthetic sections
  }),
})

export type SectionNode = z.infer<typeof SectionNodeSchema>

/**
 * Paragraph node - maps each span to its parent section
 */
export const ParagraphNodeSchema = z.object({
  sectionId: z.string(),
})

export type ParagraphNode = z.infer<typeof ParagraphNodeSchema>

/**
 * NodeMap - hierarchical structure mapping for the document
 * Groups spans into sections and chapters based on heading structure
 */
export const NodeMapSchema = z.object({
  book: BookNodeSchema,
  chapters: z.record(z.string(), ChapterNodeSchema),
  sections: z.record(z.string(), SectionNodeSchema),
  paragraphs: z.record(z.string(), ParagraphNodeSchema),
})

export type NodeMap = z.infer<typeof NodeMapSchema>
