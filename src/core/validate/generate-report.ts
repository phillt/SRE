import { Span } from '../contracts/span.js'
import { Manifest } from '../contracts/manifest.js'
import { NodeMap } from '../contracts/node-map.js'
import {
  BuildReport,
  SpanRef,
  Summary,
  LengthStats,
  Thresholds,
  Warnings,
  Samples,
  Provenance,
} from '../contracts/report.js'

/**
 * Truncate text to a maximum length, adding '...' if truncated
 */
function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

/**
 * Calculate percentile value from sorted array using nearest rank method
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    return 0
  }
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
  return sortedValues[Math.max(0, index)]
}

/**
 * Generate a quality report from spans, manifest, and node map.
 * Pure function with no side effects.
 *
 * @param spans - Array of span objects
 * @param manifest - Manifest metadata
 * @param nodeMap - Hierarchical node map
 * @returns BuildReport with quality metrics
 */
export function generateReport(spans: Span[], manifest: Manifest, nodeMap: NodeMap): BuildReport {
  // Define thresholds
  const thresholds: Thresholds = {
    shortSpanChars: 20,
    longSpanChars: 2000,
  }

  // Calculate lengths and find min/max
  const spanLengths = spans.map((span) => span.text.length)
  const totalChars = spanLengths.reduce((sum, len) => sum + len, 0)
  const avgCharsPerSpan = spans.length > 0 ? totalChars / spans.length : 0

  // Count multi-line spans (spans with internal newlines)
  const multiLineSpans = spans.filter((span) => span.text.includes('\n')).length

  // Count chapters and sections from node map
  const chapterCount = Object.keys(nodeMap.chapters).length
  const sectionCount = Object.keys(nodeMap.sections).length

  // Summary
  const summary: Summary = {
    spanCount: spans.length,
    totalChars,
    avgCharsPerSpan: Math.round(avgCharsPerSpan * 100) / 100, // round to 2 decimals
    multiLineSpans,
    chapterCount,
    sectionCount,
  }

  // Find min and max spans
  let minSpan: { span: Span; chars: number } | null = null
  let maxSpan: { span: Span; chars: number } | null = null

  for (const span of spans) {
    const chars = span.text.length
    if (!minSpan || chars < minSpan.chars) {
      minSpan = { span, chars }
    }
    if (!maxSpan || chars > maxSpan.chars) {
      maxSpan = { span, chars }
    }
  }

  // Length statistics
  const sortedLengths = [...spanLengths].sort((a, b) => a - b)

  const lengthStats: LengthStats = {
    min: {
      chars: minSpan?.chars ?? 0,
      id: minSpan?.span.id ?? '',
      order: minSpan?.span.meta.order ?? 0,
    },
    max: {
      chars: maxSpan?.chars ?? 0,
      id: maxSpan?.span.id ?? '',
      order: maxSpan?.span.meta.order ?? 0,
    },
    p10: calculatePercentile(sortedLengths, 10),
    p50: calculatePercentile(sortedLengths, 50),
    p90: calculatePercentile(sortedLengths, 90),
  }

  // Warnings: count short and long spans
  const shortSpans = spans.filter((span) => span.text.length < thresholds.shortSpanChars).length
  const longSpans = spans.filter((span) => span.text.length > thresholds.longSpanChars).length

  // Duplicate detection: exact text matches
  const textCounts = new Map<string, number>()
  for (const span of spans) {
    const count = textCounts.get(span.text) ?? 0
    textCounts.set(span.text, count + 1)
  }
  const duplicateTexts = Array.from(textCounts.values()).filter((count) => count > 1).length

  const warnings: Warnings = {
    shortSpans,
    longSpans,
    duplicateTexts,
  }

  // Samples: shortest and longest (truncated)
  const samples: Samples = {
    shortest: truncateText(minSpan?.span.text ?? ''),
    longest: truncateText(maxSpan?.span.text ?? ''),
  }

  // Provenance: link back to manifest
  const provenance: Provenance = {
    id: manifest.id,
    sourceHash: manifest.sourceHash,
    createdAt: manifest.createdAt,
    version: manifest.version,
    format: manifest.format,
    detection: manifest.detection,
  }

  return {
    summary,
    lengthStats,
    thresholds,
    warnings,
    samples,
    provenance,
  }
}
