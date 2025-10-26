import * as path from 'path'

/**
 * Extract a title for the document.
 *
 * If a user-provided title is given, use it.
 * Otherwise, fall back to the filename (without extension).
 *
 * @param sourcePath - Absolute path to the source file
 * @param userTitle - Optional user-provided title
 * @returns The title to use for the document
 */
export function extractTitle(sourcePath: string, userTitle?: string): string {
  if (userTitle) {
    return userTitle
  }

  // Fallback: use filename without extension
  const basename = path.basename(sourcePath)
  const ext = path.extname(basename)
  return basename.slice(0, -ext.length)
}
