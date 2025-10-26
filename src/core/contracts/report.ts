import { z } from 'zod'

/**
 * Summary statistics for the build
 */
export const SummarySchema = z.object({
  spanCount: z.number().int().nonnegative(),
  totalChars: z.number().int().nonnegative(),
  avgCharsPerSpan: z.number().nonnegative(),
  multiLineSpans: z.number().int().nonnegative(),
  chapterCount: z.number().int().nonnegative(),
  sectionCount: z.number().int().nonnegative(),
})

export type Summary = z.infer<typeof SummarySchema>

/**
 * Min/Max span information
 */
export const SpanRefSchema = z.object({
  chars: z.number().int().nonnegative(),
  id: z.string(),
  order: z.number().int().nonnegative(),
})

export type SpanRef = z.infer<typeof SpanRefSchema>

/**
 * Length distribution statistics
 */
export const LengthStatsSchema = z.object({
  min: SpanRefSchema,
  max: SpanRefSchema,
  p10: z.number().int().nonnegative(),
  p50: z.number().int().nonnegative(),
  p90: z.number().int().nonnegative(),
})

export type LengthStats = z.infer<typeof LengthStatsSchema>

/**
 * Quality thresholds
 */
export const ThresholdsSchema = z.object({
  shortSpanChars: z.number().int().positive(),
  longSpanChars: z.number().int().positive(),
})

export type Thresholds = z.infer<typeof ThresholdsSchema>

/**
 * Quality warnings
 */
export const WarningsSchema = z.object({
  shortSpans: z.number().int().nonnegative(),
  longSpans: z.number().int().nonnegative(),
  duplicateTexts: z.number().int().nonnegative(),
})

export type Warnings = z.infer<typeof WarningsSchema>

/**
 * Sample span texts
 */
export const SamplesSchema = z.object({
  shortest: z.string(),
  longest: z.string(),
})

export type Samples = z.infer<typeof SamplesSchema>

/**
 * Provenance information linking to manifest
 */
export const ProvenanceSchema = z.object({
  id: z.string(),
  sourceHash: z.string(),
  createdAt: z.string().datetime(),
  version: z.string(),
  format: z.string(),
  detection: z.enum(['auto', 'flag']),
})

export type Provenance = z.infer<typeof ProvenanceSchema>

/**
 * Build quality report
 * Provides deterministic QC metrics for each build
 */
export const BuildReportSchema = z.object({
  summary: SummarySchema,
  lengthStats: LengthStatsSchema,
  thresholds: ThresholdsSchema,
  warnings: WarningsSchema,
  samples: SamplesSchema,
  provenance: ProvenanceSchema,
})

export type BuildReport = z.infer<typeof BuildReportSchema>
