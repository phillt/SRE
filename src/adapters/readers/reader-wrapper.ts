import fs from 'fs-extra'
import * as path from 'path'
import { Reader } from '../../core/contracts/reader.js'
import { ReaderResult } from '../../core/contracts/reader-result.js'
import { normalizeText } from '../../core/normalize/normalize-text.js'
import { generateHash } from '../../utils/hash.js'

/**
 * Enrich minimal reader output with standardized metadata.
 *
 * Takes a Reader's simple { text } output and adds:
 * - Absolute source path
 * - Text normalization
 * - Content hash
 * - File size
 * - Format tracking
 *
 * This separates concerns:
 * - Reader: Format-specific text extraction
 * - Wrapper: Format-agnostic metadata enrichment
 *
 * @param reader - The reader to use for extraction
 * @param filePath - Path to the file to read
 * @param format - Detected or specified format
 * @returns Complete ReaderResult with all metadata
 */
export async function enrichReaderOutput(
  reader: Reader,
  filePath: string,
  format: string
): Promise<ReaderResult> {
  // Resolve to absolute path
  const sourcePath = path.resolve(filePath)

  // Get original file size
  const stats = await fs.stat(sourcePath)
  const byteLength = stats.size

  // Extract text using the reader
  const { text: rawText } = await reader.extract(sourcePath)

  // Normalize text using core logic
  const text = normalizeText(rawText)

  // Generate content hash
  const sourceHash = generateHash(text)

  return {
    text,
    sourcePath,
    sourceHash,
    byteLength,
    format,
  }
}
