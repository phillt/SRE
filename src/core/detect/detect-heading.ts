/**
 * Information about a detected heading
 */
export interface HeadingInfo {
  level: number // 1 for #, 2 for ##, 3 for ### (0 if not a heading)
  text: string // Heading text without # prefix
  isHeading: boolean
}

/**
 * Detect if text is a Markdown heading and extract heading information.
 * Recognizes H1, H2, and H3 headings (1-3 # characters followed by space).
 *
 * This is a pure function with no side effects.
 *
 * @param text - The text to check for heading syntax
 * @returns HeadingInfo with level, text, and isHeading flag
 */
export function detectHeading(text: string): HeadingInfo {
  // Match lines starting with 1-3 # followed by space and content
  const match = text.match(/^(#{1,3})\s+(.+)$/)

  if (!match) {
    return {
      level: 0,
      text: '',
      isHeading: false,
    }
  }

  return {
    level: match[1].length,
    text: match[2].trim(),
    isHeading: true,
  }
}
