import { Reader } from '../../core/contracts/reader.js'
import { textReaderAdapter } from './text-reader-adapter.js'

/**
 * Registry of all available readers.
 * To add a new reader: implement Reader interface, import it, and add to this array.
 */
const readers: Reader[] = [
  textReaderAdapter,
  // Future readers: pdfReader, epubReader, markdownReader, etc.
]

/**
 * Get a reader that can handle the specified format.
 *
 * @param format - File format (e.g., 'txt', 'pdf', 'md')
 * @returns Reader instance that can handle the format
 * @throws Error if no reader found for the format
 */
export function getReaderFor(format: string): Reader {
  const normalizedFormat = format.toLowerCase()

  // Find a reader that can handle this format
  const reader = readers.find((r) => r.canHandle(normalizedFormat))

  if (!reader) {
    const supportedFormats = getSupportedFormats().join(', ')
    throw new Error(
      `No reader found for format '${format}'.\n` +
        `Supported formats: ${supportedFormats}`
    )
  }

  return reader
}

/**
 * Get list of all supported file formats.
 *
 * @returns Array of format strings (e.g., ['txt', 'text', 'pdf'])
 */
export function getSupportedFormats(): string[] {
  const formats = new Set<string>()

  for (const reader of readers) {
    for (const format of reader.formats) {
      formats.add(format)
    }
  }

  return Array.from(formats).sort()
}

// Re-export for convenience
export { enrichReaderOutput } from './reader-wrapper.js'
export { detectFormat } from '../../utils/detect-format.js'
