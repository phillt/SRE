/**
 * Complete result of reading a file through the reader system.
 *
 * This extends the minimal Reader output ({ text }) with standardized
 * metadata that the pipeline requires for processing.
 */
export interface ReaderResult {
  /**
   * Normalized text content
   */
  text: string

  /**
   * Absolute path to the source file
   */
  sourcePath: string

  /**
   * SHA-256 hash of the normalized text
   */
  sourceHash: string

  /**
   * Original file size in bytes
   */
  byteLength: number

  /**
   * Detected or specified file format
   */
  format: string
}
