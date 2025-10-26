import fs from 'fs-extra'
import { Reader } from '../../core/contracts/reader.js'

/**
 * Text file reader adapter.
 *
 * Implements the minimal Reader interface for plain text files.
 * Handles .txt, .text, .md, and .markdown extensions.
 *
 * Markdown files are treated as plain text - formatting syntax is preserved
 * and will be visible in the extracted text spans.
 */
export class TextReaderAdapter implements Reader {
  readonly name = 'text'
  readonly formats = ['txt', 'text', 'md', 'markdown']

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
