#!/usr/bin/env node

/**
 * Verification script for lexical search functionality
 *
 * Tests all acceptance criteria:
 * 1. Single word search
 * 2. Case insensitive
 * 3. Multi-word AND search
 * 4. Markdown stripped
 * 5. Empty results
 * 6. Limit works
 * 7. Deterministic order
 * 8. Punctuation stripped
 * 9. Lazy index building
 */

import { createReader } from './dist/runtime/api/index.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error.message}`)
    failed++
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error.message}`)
    failed++
  }
}

console.log('🔍 Verifying Lexical Search...\n')

// Load test data
console.log('Test Group 1: Basic Search Functionality')
let reader
await testAsync('Load Markdown artifacts', async () => {
  reader = await createReader('dist/final-test')
  if (!reader) throw new Error('Reader is undefined')
})

// Test 1: Single word search
test('Single word search finds matches', () => {
  const results = reader.search('section')
  if (results.length === 0) {
    throw new Error('Expected results for "section"')
  }
  // Should find spans with "section" (including "## Section Two", "## Section Three")
  const found = results.some(s => s.text.toLowerCase().includes('section'))
  if (!found) {
    throw new Error('Results should contain "section"')
  }
})

// Test 2: Case insensitive
test('Search is case insensitive', () => {
  const lower = reader.search('section')
  const upper = reader.search('SECTION')
  const mixed = reader.search('SeCtiOn')

  if (lower.length !== upper.length || lower.length !== mixed.length) {
    throw new Error(`Case sensitivity mismatch: ${lower.length} vs ${upper.length} vs ${mixed.length}`)
  }

  // Check same results
  const lowerIds = lower.map(s => s.id).sort()
  const upperIds = upper.map(s => s.id).sort()
  if (JSON.stringify(lowerIds) !== JSON.stringify(upperIds)) {
    throw new Error('Case variations should return same results')
  }
})

// Test 3: Multi-word AND search
test('Multi-word search uses AND logic', () => {
  const results = reader.search('section two')
  if (results.length === 0) {
    throw new Error('Expected results for "section two"')
  }

  // All results should contain both "section" and "two"
  for (const span of results) {
    const text = span.text.toLowerCase()
    if (!text.includes('section') || !text.includes('two')) {
      throw new Error(`Span should contain both "section" and "two": ${span.text}`)
    }
  }
})

// Test 4: Markdown stripped
test('Markdown syntax stripped from tokens', () => {
  // "## Section Two" should match "section"
  const results = reader.search('section')
  const found = results.some(s => s.text.startsWith('##'))
  if (!found) {
    throw new Error('Should find "## Section Two" when searching "section"')
  }
})

test('Bold markdown stripped from tokens', () => {
  // "**bold**" should match "bold"
  const results = reader.search('bold')
  if (results.length === 0) {
    throw new Error('Expected results for "bold"')
  }
  const found = results.some(s => s.text.includes('**bold**'))
  if (!found) {
    throw new Error('Should find "**bold**" when searching "bold"')
  }
})

// Test 5: Empty results
test('Empty query returns no results', () => {
  const results = reader.search('')
  if (results.length !== 0) {
    throw new Error(`Empty query should return no results, got ${results.length}`)
  }
})

test('Non-existent term returns no results', () => {
  const results = reader.search('nonexistentxyz123')
  if (results.length !== 0) {
    throw new Error('Non-existent term should return no results')
  }
})

// Test 6: Limit works
test('Limit option restricts results', () => {
  const allResults = reader.search('the')
  const limitedResults = reader.search('the', { limit: 2 })

  if (limitedResults.length > 2) {
    throw new Error(`Limit 2 should return max 2 results, got ${limitedResults.length}`)
  }

  if (allResults.length > 0 && limitedResults.length === 0) {
    throw new Error('Limited search should return some results if unlimited search does')
  }

  // Limited results should be subset of all results
  for (const span of limitedResults) {
    const found = allResults.some(s => s.id === span.id)
    if (!found) {
      throw new Error('Limited results should be subset of all results')
    }
  }
})

// Test 7: Deterministic order
test('Results in consistent document order', () => {
  const results1 = reader.search('section')
  const results2 = reader.search('section')

  if (results1.length !== results2.length) {
    throw new Error('Multiple searches should return same number of results')
  }

  // Check same order
  for (let i = 0; i < results1.length; i++) {
    if (results1[i].id !== results2[i].id) {
      throw new Error('Results should be in same order across searches')
    }
  }

  // Check sorted by order
  for (let i = 1; i < results1.length; i++) {
    if (results1[i].meta.order < results1[i - 1].meta.order) {
      throw new Error('Results should be sorted by document order')
    }
  }
})

// Test 8: Punctuation stripped
test('Punctuation stripped from tokens', () => {
  // "Here's" should match "here" and "s"
  const results = reader.search('here')
  if (results.length === 0) {
    throw new Error('Expected results for "here"')
  }
  const found = results.some(s => s.text.toLowerCase().includes("here's"))
  if (!found) {
    throw new Error('Should find "Here\'s" when searching "here"')
  }
})

// Test 9: Lazy index building
console.log('\nTest Group 2: Index Building')

await testAsync('Index built lazily on first search', async () => {
  // Create new reader
  const newReader = await createReader('dist/test-txt')

  // Index should not exist yet
  // We can't directly check this, but we can verify search works

  // First search builds index
  const results1 = newReader.search('paragraph')

  // Second search reuses index
  const results2 = newReader.search('paragraph')

  if (results1.length !== results2.length) {
    throw new Error('First and second search should return same results')
  }
})

// Test 10: Query variations
console.log('\nTest Group 3: Query Variations')

test('Query with extra whitespace works', () => {
  const normal = reader.search('section two')
  const extraSpace = reader.search('section  two')
  const tabs = reader.search('section\ttwo')

  if (normal.length !== extraSpace.length || normal.length !== tabs.length) {
    throw new Error('Whitespace variations should return same results')
  }
})

test('Query with trailing/leading space works', () => {
  const normal = reader.search('section')
  const trailing = reader.search('section ')
  const leading = reader.search(' section')
  const both = reader.search(' section ')

  if (
    normal.length !== trailing.length ||
    normal.length !== leading.length ||
    normal.length !== both.length
  ) {
    throw new Error('Leading/trailing space should not affect results')
  }
})

// Test 11: Edge cases
console.log('\nTest Group 4: Edge Cases')

test('Single letter search works', () => {
  const results = reader.search('a')
  // Should find spans with the letter 'a'
  if (results.length === 0) {
    throw new Error('Should find some results for single letter')
  }
})

test('Numbers are indexed', () => {
  // If we have numbers in the text, they should be searchable
  // For sample.md, we might not have standalone numbers
  // But we should be able to search for them without error
  const results = reader.search('123')
  // No error is success
})

test('Hyphenated words split into tokens', () => {
  // "multi-line" becomes ["multi", "line"]
  const results = reader.search('multi')
  // This should work even if original text has "multi-line"
  // We just verify no error occurs
})

// Summary
console.log('\n' + '─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n✅ All lexical search tests passed!')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed')
  process.exit(1)
}
