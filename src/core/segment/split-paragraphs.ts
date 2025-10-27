import { Span, SpanSchema } from '../contracts/span.js'
import { generateSpanId } from '../ids/generate-span-id.js'
import { detectHeading } from '../detect/detect-heading.js'
import { HeadingPathBuilder } from '../detect/build-heading-path.js'

/**
 * Split normalized text into paragraph spans.
 * - Splits on two or more newlines (paragraph boundaries)
 * - Trims each paragraph and drops empties
 * - Assigns sequential IDs and order metadata
 * - For Markdown: detects headings and builds hierarchical paths
 * - Validates each span with Zod
 *
 * This is a pure function with no side effects.
 *
 * @param normalizedText - The normalized text to split
 * @param format - The document format (e.g., 'md', 'markdown', 'txt')
 * @returns Array of spans with metadata including heading paths
 */
export function splitIntoParagraphs(
  normalizedText: string,
  format: string
): Span[] {
  // Split on two or more newlines
  const rawParagraphs = normalizedText.split(/\n{2,}/)

  const spans: Span[] = []
  let order = 0

  // Initialize heading path builder
  const pathBuilder = new HeadingPathBuilder()
  const isMarkdown = format === 'md' || format === 'markdown'

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim()

    // Drop empty paragraphs
    if (trimmed.length === 0) {
      continue
    }

    // Detect heading first (for Markdown)
    let headingPath: string[] = []
    if (isMarkdown) {
      const heading = detectHeading(trimmed)
      if (heading.isHeading) {
        // For heading spans: get parent path (excludes same-level and lower siblings)
        headingPath = pathBuilder.getParentPath(heading.level)
        pathBuilder.update(heading.level, heading.text)
      } else {
        // For non-heading spans: get current full path
        headingPath = pathBuilder.getCurrentPath()
      }
    }

    // Create span with sequential ID and heading path
    const span: Span = {
      id: generateSpanId(order),
      text: trimmed,
      meta: {
        order,
        headingPath,
      },
    }

    // Validate with Zod
    SpanSchema.parse(span)

    spans.push(span)
    order++
  }

  return spans
}
