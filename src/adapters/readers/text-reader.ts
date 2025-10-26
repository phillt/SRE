import fs from 'fs-extra'
import { NormalizedText } from '../../core/contracts/normalized-text.js'
import { normalizeText } from '../../core/normalize/normalize-text.js'
import { generateHash } from '../../utils/hash.js'

/**
 * Read and normalize text from a file.
 * Combines file I/O with core normalization logic.
 */
export async function readAndNormalizeText(filePath: string): Promise<NormalizedText> {
  // Read file (I/O operation)
  const rawText = await fs.readFile(filePath, 'utf-8')

  // Normalize using core logic
  const normalized = normalizeText(rawText)

  // Generate content hash
  const sourceHash = generateHash(normalized)

  return {
    text: normalized,
    sourceHash,
  }
}
