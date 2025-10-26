import fs from 'fs-extra'
import * as path from 'path'
import { Span } from '../../core/contracts/span.js'

/**
 * Write spans to a JSONL (JSON Lines) file.
 * Each span is written as a single JSON object on its own line.
 */
export async function writeSpansJsonl(
  spans: Span[],
  outputDir: string,
  filename: string = 'spans.jsonl'
): Promise<string> {
  // Ensure output directory exists
  await fs.ensureDir(outputDir)

  // Convert spans to JSONL format
  const lines = spans.map((span) => JSON.stringify(span)).join('\n')

  // Write to file
  const outputPath = path.join(outputDir, filename)
  await fs.writeFile(outputPath, lines + '\n', 'utf-8')

  return outputPath
}
