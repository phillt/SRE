/**
 * Builds hierarchical heading paths as documents are processed.
 * Maintains state of current H1, H2, and H3 headings.
 *
 * Used during span generation to attach heading path to each span.
 */
export class HeadingPathBuilder {
  private h1: string | null = null
  private h2: string | null = null
  private h3: string | null = null

  /**
   * Update the heading hierarchy based on a new heading.
   * Lower-level headings are reset when a higher-level heading is encountered.
   *
   * @param level - Heading level (1, 2, or 3)
   * @param text - Heading text
   */
  update(level: number, text: string): void {
    if (level === 1) {
      this.h1 = text
      this.h2 = null
      this.h3 = null
    } else if (level === 2) {
      this.h2 = text
      this.h3 = null
    } else if (level === 3) {
      this.h3 = text
    }
  }

  /**
   * Get the current heading path.
   * Returns array of heading texts from H1 → H2 → H3 (as applicable).
   *
   * @returns Array of heading texts representing current position in hierarchy
   */
  getCurrentPath(): string[] {
    const path: string[] = []
    if (this.h1) path.push(this.h1)
    if (this.h2) path.push(this.h2)
    if (this.h3) path.push(this.h3)
    return path
  }

  /**
   * Get the parent path for a heading of a given level.
   * For a level N heading, returns headings of level < N.
   *
   * @param level - Heading level (1, 2, or 3)
   * @returns Array of parent heading texts
   */
  getParentPath(level: number): string[] {
    const path: string[] = []
    if (level > 1 && this.h1) path.push(this.h1)
    if (level > 2 && this.h2) path.push(this.h2)
    return path
  }
}
