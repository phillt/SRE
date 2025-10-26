import { readAndNormalizeText } from '../adapters/readers/text-reader.js'
import { writeSpansJsonl } from '../adapters/writers/jsonl-writer.js'
import { splitIntoParagraphs } from '../core/segment/split-paragraphs.js'
import { Span } from '../core/contracts/span.js'

/**
 * Result of the spanize pipeline
 */
export interface SpanizeResult {
  spans: Span[]
  sourceHash: string
  outputPath: string
}

/**
 * Spanize pipeline: orchestrates the process of converting a text file
 * into structured paragraph spans.
 *
 * Steps:
 * 1. Read and normalize text
 * 2. Split into paragraph spans
 * 3. Write spans to JSONL
 */
export async function spanize(
  inputPath: string,
  outputDir: string,
  options: { verbose?: boolean } = {}
): Promise<SpanizeResult> {
  if (options.verbose) {
    console.log('Reading and normalizing text...')
  }

  // Step 1: Read and normalize
  const { text, sourceHash } = await readAndNormalizeText(inputPath)

  if (options.verbose) {
    console.log(`Source hash: ${sourceHash}`)
    console.log(`Normalized text length: ${text.length}`)
    console.log('Splitting into paragraphs...')
  }

  // Step 2: Split into spans
  const spans = splitIntoParagraphs(text)

  if (spans.length === 0) {
    throw new Error('No paragraphs found in input file')
  }

  if (options.verbose) {
    console.log(`Generated ${spans.length} span(s)`)
    console.log('Writing to JSONL...')
  }

  // Step 3: Write to output
  const outputPath = await writeSpansJsonl(spans, outputDir)

  return {
    spans,
    sourceHash,
    outputPath,
  }
}
