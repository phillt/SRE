import {
  getReaderFor,
  enrichReaderOutput,
  detectFormat,
} from '../adapters/readers/index.js'
import { writeSpansJsonl } from '../adapters/writers/jsonl-writer.js'
import { writeManifest } from '../adapters/writers/manifest-writer.js'
import { writeReport } from '../adapters/writers/report-writer.js'
import { writeNodeMap } from '../adapters/writers/node-map-writer.js'
import { splitIntoParagraphs } from '../core/segment/split-paragraphs.js'
import { generateCorpusId } from '../core/ids/generate-corpus-id.js'
import { generateReport } from '../core/validate/generate-report.js'
import { generateNodeMap } from '../core/structure/generate-node-map.js'
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
  nodeMapPath: string
}

/**
 * Spanize pipeline: orchestrates the process of converting a text file
 * into structured paragraph spans.
 *
 * Steps:
 * 1. Detect format and get appropriate reader
 * 2. Read and normalize text via reader + wrapper
 * 3. Split into paragraph spans (with heading paths for Markdown)
 * 4. Write spans to JSONL
 * 5. Generate and write manifest JSON
 * 6. Generate and write node map
 * 7. Generate and write build report
 */
export async function spanize(
  inputPath: string,
  outputDir: string,
  options: { verbose?: boolean; title?: string; format?: string } = {}
): Promise<SpanizeResult> {
  // Step 1: Detect format and get appropriate reader
  const format = detectFormat(inputPath, options.format)
  const detection: 'auto' | 'flag' = options.format ? 'flag' : 'auto'
  const reader = getReaderFor(format)

  if (options.verbose) {
    console.log(`Format: ${format} (reader: ${reader.name})`)
    console.log('Reading and normalizing text...')
  }

  // Step 2: Read file with metadata enrichment
  const { text, sourcePath, sourceHash, byteLength } = await enrichReaderOutput(
    reader,
    inputPath,
    format
  )

  if (options.verbose) {
    console.log(`Source path: ${sourcePath}`)
    console.log(`Source hash: ${sourceHash}`)
    console.log(`Original size: ${byteLength} bytes`)
    console.log(`Normalized text length: ${text.length} characters`)
    console.log('Splitting into paragraphs...')
  }

  // Step 3: Split into spans (pass format for heading detection)
  const spans = splitIntoParagraphs(text, format)

  if (spans.length === 0) {
    throw new Error('No paragraphs found in input file')
  }

  if (options.verbose) {
    console.log(`Generated ${spans.length} span(s)`)
    console.log('Writing to JSONL...')
  }

  // Step 4: Write spans to JSONL
  const outputPath = await writeSpansJsonl(spans, outputDir)

  if (options.verbose) {
    console.log('Generating manifest...')
  }

  // Step 5: Generate and write manifest
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
    format,
    detection,
    reader: reader.name,
    normalization: {
      unicode: 'NFC',
      eol: 'LF',
      blankLineCollapse: true,
    },
    schema: {
      span: '1.0.0',
      manifest: '1.0.0',
      nodeMap: '1.0.0',
    },
  }

  const manifestPath = await writeManifest(manifest, outputDir)

  if (options.verbose) {
    console.log(`Manifest written → ${manifestPath}`)
    console.log('Generating node map...')
  }

  // Step 6: Generate and write node map
  const nodeMap = generateNodeMap(spans, manifest)
  const nodeMapPath = await writeNodeMap(nodeMap, outputDir)

  if (options.verbose) {
    console.log(`Node map written → ${nodeMapPath}`)
    console.log('Generating build report...')
  }

  // Step 7: Generate and write build report
  const report = generateReport(spans, manifest, nodeMap)
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
    nodeMapPath,
  }
}
