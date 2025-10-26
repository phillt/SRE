import * as path from 'path'

/**
 * Detect file format from path or explicit format string.
 *
 * Priority:
 * 1. If explicitFormat provided, use it (allows override)
 * 2. Otherwise, extract extension from file path
 *
 * @param filePath - Path to the file
 * @param explicitFormat - Optional format override
 * @returns Normalized format string (lowercase, no dot)
 *
 * @example
 * detectFormat('input.txt') // 'txt'
 * detectFormat('input.TXT') // 'txt'
 * detectFormat('input.pdf', 'txt') // 'txt' (explicit override)
 * detectFormat('noextension') // '' (no extension)
 */
export function detectFormat(filePath: string, explicitFormat?: string): string {
  // If explicit format provided, use it
  if (explicitFormat) {
    return explicitFormat.toLowerCase().replace(/^\./, '')
  }

  // Extract extension from file path
  const ext = path.extname(filePath)

  // Remove leading dot and normalize to lowercase
  // .txt → txt
  // .TXT → txt
  // (empty) → (empty)
  return ext.slice(1).toLowerCase()
}
