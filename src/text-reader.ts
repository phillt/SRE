import fs from 'fs-extra'
import * as crypto from 'crypto'

export interface NormalizedText {
  text: string
  sourceHash: string
}

/**
 * Read and normalize text from a file
 * - Converts \r\n to \n
 * - Trims leading/trailing whitespace
 * - Collapses multiple blank lines to one
 */
export async function readAndNormalizeText(filePath: string): Promise<NormalizedText> {
  // Read file
  const rawText = await fs.readFile(filePath, 'utf-8')

  // Normalize line endings
  let normalized = rawText.replace(/\r\n/g, '\n')

  // Trim leading/trailing whitespace
  normalized = normalized.trim()

  // Collapse multiple blank lines to one (two or more consecutive newlines → two newlines)
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  // Create source hash
  const sourceHash = crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')

  return {
    text: normalized,
    sourceHash,
  }
}
