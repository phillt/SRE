import fs from 'fs-extra'
import * as path from 'path'
import { normalizeText } from '../../core/normalize/normalize-text.js'
import { generateHash } from '../../utils/hash.js'

/**
 * Result of reading and normalizing a text file
 */
export interface TextFileResult {
  text: string // normalized text
  sourcePath: string // absolute file path
  sourceHash: string // SHA-256 hash of normalized text
  byteLength: number // original file size in bytes
}

/**
 * Read and normalize text from a file.
 * Combines file I/O with core normalization logic.
 *
 * Returns normalized text with metadata for pipeline processing.
 */
export async function readTextFile(filePath: string): Promise<TextFileResult> {
  // Resolve to absolute path
  const absolutePath = path.resolve(filePath)

  // Read file (I/O operation)
  const rawText = await fs.readFile(absolutePath, 'utf-8')

  // Get original byte length
  const stats = await fs.stat(absolutePath)
  const byteLength = stats.size

  // Normalize using core logic
  const normalized = normalizeText(rawText)

  // Generate content hash
  const sourceHash = generateHash(normalized)

  return {
    text: normalized,
    sourcePath: absolutePath,
    sourceHash,
    byteLength,
  }
}
