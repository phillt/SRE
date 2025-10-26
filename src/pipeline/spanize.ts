import { readTextFile } from '../adapters/readers/text-reader.js'
import { writeSpansJsonl } from '../adapters/writers/jsonl-writer.js'
import { writeManifest } from '../adapters/writers/manifest-writer.js'
import { writeReport } from '../adapters/writers/report-writer.js'
import { splitIntoParagraphs } from '../core/segment/split-paragraphs.js'
import { generateCorpusId } from '../core/ids/generate-corpus-id.js'
import { generateReport } from '../core/validate/generate-report.js'
import { Span } from '../core/contracts/span.js'
import { Manifest } from '../core/contracts/manifest.js'
import { extractTitle } from '../utils/extract-title.js'
import { getVersion } from '../utils/read-version.js'

/**
 * Result of the spanize pipeline
 */
export interface SpanizeResult {
  spans: Span[]
  sourcePath: string
  sourceHash: string
  byteLength: number
  outputPath: string
  manifestPath: string
  reportPath: string
}

/**
 * Spanize pipeline: orchestrates the process of converting a text file
 * into structured paragraph spans.
 *
 * Steps:
 * 1. Read and normalize text
 * 2. Split into paragraph spans
 * 3. Write spans to JSONL
 * 4. Write manifest JSON
 * 5. Generate and write build report
 */
export async function spanize(
  inputPath: string,
  outputDir: string,
  options: { verbose?: boolean; title?: string } = {}
): Promise<SpanizeResult> {
  if (options.verbose) {
    console.log('Reading and normalizing text...')
  }

  // Step 1: Read and normalize
  const { text, sourcePath, sourceHash, byteLength } = await readTextFile(inputPath)

  if (options.verbose) {
    console.log(`Source path: ${sourcePath}`)
    console.log(`Source hash: ${sourceHash}`)
    console.log(`Original size: ${byteLength} bytes`)
    console.log(`Normalized text length: ${text.length} characters`)
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

  // Step 3: Write spans to JSONL
  const outputPath = await writeSpansJsonl(spans, outputDir)

  if (options.verbose) {
    console.log('Generating manifest...')
  }

  // Step 4: Generate and write manifest
  const title = extractTitle(sourcePath, options.title)
  const version = await getVersion()
  const corpusId = generateCorpusId(sourceHash)

  const manifest: Manifest = {
    id: corpusId,
    title,
    createdAt: new Date().toISOString(),
    sourcePath,
    sourceHash,
    byteLength,
    spanCount: spans.length,
    version,
    normalization: {
      unicode: 'NFC',
      eol: 'LF',
      blankLineCollapse: true,
    },
    schema: {
      span: '1.0.0',
      manifest: '1.0.0',
    },
  }

  const manifestPath = await writeManifest(manifest, outputDir)

  if (options.verbose) {
    console.log(`Manifest written → ${manifestPath}`)
    console.log('Generating build report...')
  }

  // Step 5: Generate and write build report
  const report = generateReport(spans, manifest)
  const reportPath = await writeReport(report, outputDir)

  if (options.verbose) {
    console.log(`Report written → ${reportPath}`)
  }

  return {
    spans,
    sourcePath,
    sourceHash,
    byteLength,
    outputPath,
    manifestPath,
    reportPath,
  }
}
