/**
 * Minimal reader interface for extracting text from different file formats.
 *
 * Each reader is responsible only for extracting raw text from its
 * supported format(s). Metadata enrichment (hashing, normalization, etc.)
 * is handled separately by the reader wrapper.
 */
export interface Reader {
  /**
   * Reader name for identification
   */
  readonly name: string

  /**
   * File formats this reader can handle (e.g., ["txt", "text"])
   */
  readonly formats: string[]

  /**
   * Check if this reader can handle the given format
   */
  canHandle(format: string): boolean

  /**
   * Extract raw text from the file.
   * Returns only the text content - metadata is added by the wrapper.
   */
  extract(filePath: string): Promise<{ text: string }>
}
