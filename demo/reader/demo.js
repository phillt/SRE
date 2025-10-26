#!/usr/bin/env node

/**
 * Demo script showing Reader API usage
 */

import { createReader } from '../../dist/runtime/api/index.js'

async function demo() {
  console.log('📖 SRE Runtime Reader Demo\n')

  // Load artifacts
  console.log('Loading artifacts from dist/final-test...')
  const reader = await createReader('dist/final-test')
  console.log('✅ Loaded successfully\n')

  // Show manifest
  const manifest = reader.getManifest()
  console.log('📄 Document Info:')
  console.log(`  Title: ${manifest.title}`)
  console.log(`  Format: ${manifest.format}`)
  console.log(`  Spans: ${manifest.spanCount}`)
  console.log(`  Corpus ID: ${manifest.id}`)
  console.log(`  Created: ${manifest.createdAt}\n`)

  // Show first and last spans
  console.log('📝 First Span:')
  const firstSpan = reader.getByOrder(0)
  console.log(`  ID: ${firstSpan.id}`)
  console.log(`  Text: "${firstSpan.text}"`)
  console.log(`  Heading Path: [${firstSpan.meta.headingPath.join(' > ')}]\n`)

  console.log('📝 Last Span:')
  const lastSpan = reader.getByOrder(reader.getSpanCount() - 1)
  console.log(`  ID: ${lastSpan.id}`)
  console.log(`  Text: "${lastSpan.text}"`)
  console.log(`  Heading Path: [${lastSpan.meta.headingPath.join(' > ')}]\n`)

  // Show context around middle span
  const middleOrder = Math.floor(reader.getSpanCount() / 2)
  const middleSpan = reader.getByOrder(middleOrder)
  console.log(`🔍 Context around span ${middleSpan.id}:`)
  const contextIds = reader.neighbors(middleSpan.id, { before: 1, after: 1 })
  for (const id of contextIds) {
    const span = reader.getSpan(id)
    const marker = id === middleSpan.id ? '>>>' : '   '
    const preview = span.text.length > 60 ? span.text.substring(0, 60) + '...' : span.text
    console.log(`${marker} ${id}: "${preview}"`)
  }
  console.log()

  // Show sections
  const sections = reader.listSections()
  console.log(`📂 Document Structure (${sections.length} sections):\n`)
  for (const sectionId of sections) {
    const section = reader.getSection(sectionId)
    const nodeMap = reader.getNodeMap()
    const sectionMeta = nodeMap.sections[sectionId]
    const heading = sectionMeta.meta.heading || '(synthetic section)'

    console.log(`  ${sectionId}: ${heading}`)
    console.log(`    Paragraphs: ${section.paragraphIds.length}`)

    // Show first span of section
    const firstSpanId = section.paragraphIds[0]
    const firstSpanInSection = reader.getSpan(firstSpanId)
    const preview =
      firstSpanInSection.text.length > 50
        ? firstSpanInSection.text.substring(0, 50) + '...'
        : firstSpanInSection.text
    console.log(`    First: "${preview}"`)
    console.log()
  }

  // Show build quality metrics
  const report = reader.getBuildReport()
  if (report) {
    console.log('📊 Build Quality:')
    console.log(`  Total characters: ${report.summary.totalChars}`)
    console.log(`  Avg chars/span: ${report.summary.avgCharsPerSpan}`)
    console.log(`  Multi-line spans: ${report.summary.multiLineSpans}`)
    console.log(`  Chapters: ${report.summary.chapterCount}`)
    console.log(`  Sections: ${report.summary.sectionCount}`)
    console.log(`  Warnings:`)
    console.log(`    Short spans: ${report.warnings.shortSpans}`)
    console.log(`    Long spans: ${report.warnings.longSpans}`)
    console.log(`    Duplicates: ${report.warnings.duplicateTexts}`)
  }

  console.log('\n✨ Demo complete!')
}

demo().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
