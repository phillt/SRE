import { Span } from '../contracts/span.js'
import { Manifest } from '../contracts/manifest.js'
import {
  NodeMap,
  BookNode,
  ChapterNode,
  SectionNode,
  ParagraphNode,
} from '../contracts/node-map.js'
import { detectHeading } from '../detect/detect-heading.js'
import { generateChapterId } from '../ids/generate-chapter-id.js'
import { generateSectionId } from '../ids/generate-section-id.js'

/**
 * Generate a hierarchical node map from spans.
 * Groups spans into sections and chapters based on heading structure.
 *
 * For plain text (no headings): creates single synthetic chapter + section
 * For Markdown: processes H1 (chapters) and H2 (sections), with synthetic sections as needed
 *
 * This is a pure function with no side effects.
 *
 * @param spans - Array of spans with heading paths
 * @param manifest - Manifest metadata
 * @returns NodeMap with hierarchical structure
 */
export function generateNodeMap(spans: Span[], manifest: Manifest): NodeMap {
  const book: BookNode = {
    id: manifest.id,
    title: manifest.title,
  }

  const chapters: Record<string, ChapterNode> = {}
  const sections: Record<string, SectionNode> = {}
  const paragraphs: Record<string, ParagraphNode> = {}

  // Check if any headings exist
  const hasHeadings = spans.some((s) => detectHeading(s.text).isHeading)

  if (!hasHeadings) {
    // Plain TXT case: create single synthetic chapter + section
    const sectionId = generateSectionId(0)
    const chapterId = generateChapterId(0)

    sections[sectionId] = {
      paragraphIds: spans.map((s) => s.id),
      meta: { heading: manifest.title },
    }

    chapters[chapterId] = {
      sectionIds: [sectionId],
      meta: {},
    }

    for (const span of spans) {
      paragraphs[span.id] = { sectionId }
    }

    return { book, chapters, sections, paragraphs }
  }

  // Markdown case: process headings
  let currentChapterId: string | null = null
  let currentSectionId: string | null = null
  let chapterOrder = -1
  let sectionOrder = -1

  for (const span of spans) {
    const heading = detectHeading(span.text)

    if (heading.isHeading && heading.level === 1) {
      // New H1 chapter
      chapterOrder++
      currentChapterId = generateChapterId(chapterOrder)
      chapters[currentChapterId] = {
        sectionIds: [],
        meta: {},
      }
      currentSectionId = null // Reset section
    }

    if (heading.isHeading && heading.level === 2) {
      // New H2 section
      sectionOrder++
      currentSectionId = generateSectionId(sectionOrder)
      sections[currentSectionId] = {
        paragraphIds: [],
        meta: { heading: span.text },
      }

      // Add to current chapter (or create synthetic chapter if needed)
      if (!currentChapterId) {
        chapterOrder++
        currentChapterId = generateChapterId(chapterOrder)
        chapters[currentChapterId] = {
          sectionIds: [],
          meta: {},
        }
      }
      chapters[currentChapterId].sectionIds.push(currentSectionId)
    }

    // Handle paragraph assignment (including heading spans themselves)
    if (!currentSectionId) {
      // Need synthetic section under current chapter
      sectionOrder++
      currentSectionId = generateSectionId(sectionOrder)
      sections[currentSectionId] = {
        paragraphIds: [],
        meta: { heading: '' }, // Empty string for synthetic sections
      }

      // Ensure we have a chapter
      if (!currentChapterId) {
        chapterOrder++
        currentChapterId = generateChapterId(chapterOrder)
        chapters[currentChapterId] = {
          sectionIds: [],
          meta: {},
        }
      }
      chapters[currentChapterId].sectionIds.push(currentSectionId)
    }

    // Add span to current section
    sections[currentSectionId].paragraphIds.push(span.id)
    paragraphs[span.id] = { sectionId: currentSectionId }
  }

  return { book, chapters, sections, paragraphs }
}
