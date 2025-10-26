import { z } from 'zod'

/**
 * Normalization settings applied during text processing
 */
export const NormalizationSchema = z.object({
  unicode: z.literal('NFC'),
  eol: z.literal('LF'),
  blankLineCollapse: z.boolean(),
})

export type Normalization = z.infer<typeof NormalizationSchema>

/**
 * Schema versions for migration tracking
 */
export const SchemaVersionsSchema = z.object({
  span: z.string(),
  manifest: z.string(),
  nodeMap: z.string(),
})

export type SchemaVersions = z.infer<typeof SchemaVersionsSchema>

/**
 * Manifest represents metadata about a processed document corpus.
 * Makes each build self-describing and reproducible.
 */
export const ManifestSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().datetime(),
  sourcePath: z.string(),
  sourceHash: z.string(),
  byteLength: z.number().int().nonnegative(),
  spanCount: z.number().int().nonnegative(),
  version: z.string(),
  format: z.string(),
  detection: z.enum(['auto', 'flag']),
  reader: z.string(),
  normalization: NormalizationSchema,
  schema: SchemaVersionsSchema,
})

export type Manifest = z.infer<typeof ManifestSchema>
