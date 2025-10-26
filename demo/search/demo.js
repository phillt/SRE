#!/usr/bin/env node

/**
 * Demo script showing lexical search functionality
 */

import { createReader } from '../../dist/runtime/api/index.js'

async function demo() {
  console.log('🔍 SRE Lexical Search Demo\n')

  // Load artifacts
  console.log('Loading artifacts from dist/final-test...')
  const reader = await createReader('dist/final-test')
  console.log('✅ Loaded successfully\n')

  // Show document info
  const manifest = reader.getManifest()
  console.log(`Document: ${manifest.title} (${manifest.spanCount} spans)\n`)

  // Example 1: Simple single-word search
  console.log('─'.repeat(60))
  console.log('Example 1: Search for "section"')
  console.log('─'.repeat(60))
  const sectionResults = reader.search('section')
  console.log(`Found ${sectionResults.length} results:\n`)
  for (const span of sectionResults) {
    const preview = span.text.length > 50 ? span.text.substring(0, 50) + '...' : span.text
    console.log(`  ${span.id}: "${preview}"`)
    console.log(`    Order: ${span.meta.order}`)
    if (span.meta.headingPath.length > 0) {
      console.log(`    Path: [${span.meta.headingPath.join(' > ')}]`)
    }
  }
  console.log()

  // Example 2: Multi-word AND search
  console.log('─'.repeat(60))
  console.log('Example 2: Search for "section two" (AND logic)')
  console.log('─'.repeat(60))
  const multiWordResults = reader.search('section two')
  console.log(`Found ${multiWordResults.length} results:\n`)
  for (const span of multiWordResults) {
    const preview = span.text.length > 50 ? span.text.substring(0, 50) + '...' : span.text
    console.log(`  ${span.id}: "${preview}"`)
  }
  console.log()

  // Example 3: Case insensitive
  console.log('─'.repeat(60))
  console.log('Example 3: Case insensitive search')
  console.log('─'.repeat(60))
  const lower = reader.search('section')
  const upper = reader.search('SECTION')
  console.log(`search("section"): ${lower.length} results`)
  console.log(`search("SECTION"): ${upper.length} results`)
  console.log(`Results identical: ${lower.length === upper.length ? '✅ Yes' : '❌ No'}\n`)

  // Example 4: Search with limit
  console.log('─'.repeat(60))
  console.log('Example 4: Search with limit')
  console.log('─'.repeat(60))
  const allParagraph = reader.search('paragraph')
  const limitedParagraph = reader.search('paragraph', { limit: 2 })
  console.log(`search("paragraph"): ${allParagraph.length} results`)
  console.log(`search("paragraph", {limit: 2}): ${limitedParagraph.length} results\n`)

  // Example 5: Markdown stripped
  console.log('─'.repeat(60))
  console.log('Example 5: Markdown syntax stripped from search')
  console.log('─'.repeat(60))
  const boldResults = reader.search('bold')
  console.log(`Searching for "bold" (finds "**bold**"):\n`)
  for (const span of boldResults) {
    console.log(`  ${span.id}: "${span.text}"`)
  }
  console.log()

  // Example 6: No results
  console.log('─'.repeat(60))
  console.log('Example 6: Search with no results')
  console.log('─'.repeat(60))
  const noResults = reader.search('nonexistent')
  console.log(`search("nonexistent"): ${noResults.length} results`)
  console.log(`Gracefully returns empty array: ✅\n`)

  // Example 7: Common word search
  console.log('─'.repeat(60))
  console.log('Example 7: Search for common word')
  console.log('─'.repeat(60))
  const commonResults = reader.search('the')
  console.log(`search("the"): ${commonResults.length} results`)
  console.log(`(No stop word filtering - all words are searchable)\n`)

  // Example 8: Full-text context search
  console.log('─'.repeat(60))
  console.log('Example 8: Find and expand with context')
  console.log('─'.repeat(60))
  const searchResults = reader.search('nested')
  if (searchResults.length > 0) {
    const targetSpan = searchResults[0]
    console.log(`Found match: ${targetSpan.id}`)
    console.log(`Text: "${targetSpan.text}"\n`)

    // Get context around the match
    const contextIds = reader.neighbors(targetSpan.id, { before: 1, after: 1 })
    console.log('Context (1 before, 1 after):\n')
    for (const id of contextIds) {
      const span = reader.getSpan(id)
      const marker = id === targetSpan.id ? '>>> ' : '    '
      const preview = span.text.length > 60 ? span.text.substring(0, 60) + '...' : span.text
      console.log(`${marker}${id}: "${preview}"`)
    }
  }
  console.log()

  console.log('✨ Demo complete!')
}

demo().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
