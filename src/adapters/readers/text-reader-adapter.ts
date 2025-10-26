import fs from 'fs-extra'
import { Reader } from '../../core/contracts/reader.js'

/**
 * Text file reader adapter.
 *
 * Implements the minimal Reader interface for plain text files.
 * Handles .txt and .text extensions.
 */
export class TextReaderAdapter implements Reader {
  readonly name = 'text'
  readonly formats = ['txt', 'text']

  canHandle(format: string): boolean {
    return this.formats.includes(format.toLowerCase())
  }

  async extract(filePath: string): Promise<{ text: string }> {
    // Read file as UTF-8
    const text = await fs.readFile(filePath, 'utf-8')

    return { text }
  }
}

/**
 * Singleton instance of the text reader
 */
export const textReaderAdapter = new TextReaderAdapter()
