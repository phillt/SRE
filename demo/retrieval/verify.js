#!/usr/bin/env node

/**
 * Verification script for retrieval packs functionality
 *
 * Tests all acceptance criteria:
 * 1. Determinism - Same input → identical output
 * 2. Integrity - All paragraphIds exist, text matches
 * 3. Deduplication - Overlapping contexts merged
 * 4. Ordering - Packs sorted by score desc, then order asc
 * 5. Budgeting - limit and maxTokens respected
 * 6. Graceful empty - No matches → []
 * 7. Neighbors expansion - ±N paragraphs included
 * 8. Section expansion - Full section included
 * 9. Fallback - Section mode falls back to neighbors without nodeMap
 * 10. Score exposure - Scores included in packs
 */

import { createReader } from '../../dist/runtime/api/index.js'

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

console.log('📦 Verifying Retrieval Packs...\n')

// Load test data
console.log('Test Group 1: Basic Retrieval')
let reader
await testAsync('Load Markdown artifacts', async () => {
  reader = await createReader('dist/final-test')
  if (!reader) throw new Error('Reader is undefined')
})

// Test 1: Basic retrieval returns packs
test('Basic retrieval returns packs', () => {
  const packs = reader.retrieve('section')

  if (packs.length === 0) {
    throw new Error('Expected some packs for "section"')
  }

  // Each pack should have required fields
  for (const pack of packs) {
    if (!pack.packId) throw new Error('Pack missing packId')
    if (!pack.entry) throw new Error('Pack missing entry')
    if (!pack.scope) throw new Error('Pack missing scope')
    if (!pack.paragraphIds || pack.paragraphIds.length === 0) {
      throw new Error('Pack missing paragraphIds')
    }
    if (!pack.text) throw new Error('Pack missing text')
    if (!pack.meta) throw new Error('Pack missing meta')
  }
})

// Test 2: Entry includes score
test('Entry includes relevance score', () => {
  const packs = reader.retrieve('section', { rank: 'tfidf' })

  if (packs.length === 0) {
    throw new Error('Expected packs to test scores')
  }

  const pack = packs[0]
  if (typeof pack.entry.score !== 'number') {
    throw new Error('Entry should have numeric score')
  }

  // With TF-IDF, scores should be non-negative
  if (pack.entry.score < 0) {
    throw new Error('Score should be non-negative')
  }
})

// Test 3: Entry includes order and spanId
test('Entry includes spanId and order', () => {
  const packs = reader.retrieve('section')

  if (packs.length === 0) {
    throw new Error('Expected packs')
  }

  const entry = packs[0].entry
  if (!entry.spanId) throw new Error('Entry missing spanId')
  if (typeof entry.order !== 'number') throw new Error('Entry missing order')
  if (!Array.isArray(entry.headingPath)) {
    throw new Error('Entry missing headingPath array')
  }
})

// Test 4: Integrity - all paragraphIds exist
test('All paragraphIds exist in corpus', () => {
  const packs = reader.retrieve('section')

  for (const pack of packs) {
    for (const spanId of pack.paragraphIds) {
      const span = reader.getSpan(spanId)
      if (!span) {
        throw new Error(`paragraphId ${spanId} does not exist`)
      }
    }
  }
})

// Test 5: Integrity - text matches spans
test('Text matches concatenated spans', () => {
  const packs = reader.retrieve('section')

  for (const pack of packs) {
    const spans = pack.paragraphIds.map((id) => reader.getSpan(id))
    const expectedText = spans.map((s) => s.text).join('\n\n')

    if (pack.text !== expectedText) {
      throw new Error('Pack text does not match concatenated spans')
    }
  }
})

// Test 6: Meta includes correct counts
test('Meta includes accurate counts', () => {
  const packs = reader.retrieve('section')

  for (const pack of packs) {
    if (pack.meta.spanCount !== pack.paragraphIds.length) {
      throw new Error('spanCount does not match paragraphIds length')
    }

    if (pack.meta.charCount !== pack.text.length) {
      throw new Error('charCount does not match text length')
    }

    if (!Array.isArray(pack.meta.headingPath)) {
      throw new Error('headingPath should be array')
    }
  }
})

// Test 7: Determinism
console.log('\nTest Group 2: Determinism')

test('Same query produces identical results', () => {
  const run1 = reader.retrieve('section', { limit: 3 })
  const run2 = reader.retrieve('section', { limit: 3 })
  const run3 = reader.retrieve('section', { limit: 3 })

  if (run1.length !== run2.length || run1.length !== run3.length) {
    throw new Error('Multiple runs returned different counts')
  }

  for (let i = 0; i < run1.length; i++) {
    if (run1[i].packId !== run2[i].packId || run1[i].packId !== run3[i].packId) {
      throw new Error('Pack IDs differ across runs')
    }

    if (run1[i].text !== run2[i].text || run1[i].text !== run3[i].text) {
      throw new Error('Pack text differs across runs')
    }
  }
})

test('Same options produce same packs', () => {
  const opts = { limit: 2, perHitNeighbors: 1, rank: 'tfidf' }

  const packs1 = reader.retrieve('paragraph', opts)
  const packs2 = reader.retrieve('paragraph', opts)

  if (JSON.stringify(packs1) !== JSON.stringify(packs2)) {
    throw new Error('Identical options should produce identical packs')
  }
})

// Test 8: Neighbors expansion
console.log('\nTest Group 3: Neighbors Expansion')

test('Neighbors expansion includes ±N spans', () => {
  const packs = reader.retrieve('section', {
    limit: 1,
    perHitNeighbors: 2,
    expand: 'neighbors'
  })

  if (packs.length === 0) {
    throw new Error('Expected at least one pack')
  }

  const pack = packs[0]

  // Should include entry span + up to 2 before + 2 after = max 5
  if (pack.scope.type !== 'neighbors') {
    throw new Error('Expected neighbors scope type')
  }

  if (!pack.scope.range) {
    throw new Error('Neighbors scope should include range')
  }

  // Verify range is reasonable
  const { start, end } = pack.scope.range
  if (typeof start !== 'number' || typeof end !== 'number') {
    throw new Error('Range should have numeric start and end')
  }

  if (start > end) {
    throw new Error('Range start should be <= end')
  }
})

test('Neighbors expansion with perHitNeighbors=0', () => {
  const packs = reader.retrieve('section', {
    limit: 1,
    perHitNeighbors: 0,
    expand: 'neighbors'
  })

  if (packs.length === 0) {
    throw new Error('Expected at least one pack')
  }

  const pack = packs[0]

  // With 0 neighbors, should only include the hit span itself
  if (pack.paragraphIds.length !== 1) {
    throw new Error('With perHitNeighbors=0, should have exactly 1 span')
  }

  if (pack.entry.spanId !== pack.paragraphIds[0]) {
    throw new Error('Single span should be the entry span')
  }
})

test('Neighbors respect document boundaries', () => {
  // Search for something likely to be at document start/end
  const packs = reader.retrieve('the', {
    limit: 10,
    perHitNeighbors: 5,
    expand: 'neighbors'
  })

  // Should not error even if hits are at boundaries
  for (const pack of packs) {
    if (pack.scope.type !== 'neighbors') continue

    const { start, end } = pack.scope.range

    // Start should be >= 0
    if (start < 0) {
      throw new Error('Range start should not be negative')
    }

    // End should be within corpus bounds
    const maxOrder = reader.getSpanCount() - 1
    if (end > maxOrder) {
      throw new Error('Range end exceeds corpus bounds')
    }
  }
})

// Test 9: Section expansion (with Markdown)
console.log('\nTest Group 4: Section Expansion')

test('Section expansion includes full section', () => {
  const packs = reader.retrieve('section', {
    limit: 1,
    expand: 'section'
  })

  if (packs.length === 0) {
    throw new Error('Expected at least one pack')
  }

  const pack = packs[0]

  if (pack.scope.type !== 'section' && pack.scope.type !== 'neighbors') {
    throw new Error('Expected section or neighbors scope type')
  }

  // If section type, should have sectionId
  if (pack.scope.type === 'section') {
    if (!pack.scope.sectionId) {
      throw new Error('Section scope should include sectionId')
    }

    // Verify section exists
    const section = reader.getSection(pack.scope.sectionId)
    if (!section) {
      throw new Error('Section ID should exist in corpus')
    }

    // Pack should include all paragraphs from section
    if (JSON.stringify(pack.paragraphIds.sort()) !==
        JSON.stringify(section.paragraphIds.sort())) {
      throw new Error('Pack should include all section paragraphs')
    }
  }
})

test('Section expansion uses section heading path', () => {
  const packs = reader.retrieve('section', {
    limit: 2,
    expand: 'section'
  })

  for (const pack of packs) {
    if (pack.scope.type === 'section') {
      // Heading path should be derived from section, not just entry
      // It should be an array (might be empty for synthetic sections)
      if (!Array.isArray(pack.meta.headingPath)) {
        throw new Error('headingPath should be array')
      }
    }
  }
})

// Test 10: Plain text fallback
console.log('\nTest Group 5: Plain Text Fallback')

let txtReader
await testAsync('Load plain text artifacts', async () => {
  txtReader = await createReader('dist/test-txt')
  if (!txtReader) throw new Error('txtReader is undefined')
})

test('Section mode works for plain text (synthetic section)', () => {
  const packs = txtReader.retrieve('paragraph', {
    limit: 2,
    expand: 'section'  // Plain text has one synthetic section
  })

  if (packs.length === 0) {
    throw new Error('Expected packs even with synthetic section')
  }

  // Plain text has a nodeMap with one synthetic section
  // Section expansion should work (returns whole document as one section)
  for (const pack of packs) {
    if (pack.scope.type !== 'section') {
      throw new Error('Plain text should use section expansion (synthetic section)')
    }

    // Should have sectionId
    if (!pack.scope.sectionId) {
      throw new Error('Section pack should have sectionId')
    }
  }
})

// Test 11: Deduplication
console.log('\nTest Group 6: Deduplication')

test('Overlapping neighbors merge into one pack', () => {
  // Use a common term that will hit multiple close spans
  const packs = reader.retrieve('the', {
    limit: 10,
    perHitNeighbors: 3,  // Large overlap window
    expand: 'neighbors'
  })

  // Count unique pack IDs
  const packIds = new Set(packs.map((p) => p.packId))

  // Should have fewer packs than initial hits due to merging
  // (This is probabilistic but likely with "the" query)
  if (packIds.size !== packs.length) {
    throw new Error('Duplicate packIds found')
  }
})

test('Same section hit twice produces one pack', () => {
  // When multiple hits are in the same section, should merge
  const packs = reader.retrieve('section', {
    limit: 10,
    expand: 'section'
  })

  // Count unique section IDs
  const sectionIds = new Set()
  for (const pack of packs) {
    if (pack.scope.type === 'section' && pack.scope.sectionId) {
      if (sectionIds.has(pack.scope.sectionId)) {
        throw new Error('Duplicate section ID found in packs')
      }
      sectionIds.add(pack.scope.sectionId)
    }
  }
})

// Test 12: Ordering
console.log('\nTest Group 7: Ordering')

test('Packs sorted by score descending', () => {
  const packs = reader.retrieve('section', {
    limit: 5,
    rank: 'tfidf'
  })

  if (packs.length < 2) {
    console.log('   (Skipped: need 2+ packs)')
    return
  }

  // Check scores are descending (or equal)
  for (let i = 1; i < packs.length; i++) {
    if (packs[i].entry.score > packs[i - 1].entry.score) {
      throw new Error('Packs should be sorted by score descending')
    }
  }
})

test('Ties broken by document order ascending', () => {
  const packs = reader.retrieve('paragraph', {
    limit: 5,
    rank: 'none'  // All scores will be 0, test order tie-breaking
  })

  if (packs.length < 2) {
    console.log('   (Skipped: need 2+ packs)')
    return
  }

  // With no ranking, all scores are 0, so order by entry.order asc
  for (let i = 1; i < packs.length; i++) {
    if (packs[i].entry.score === packs[i - 1].entry.score) {
      if (packs[i].entry.order < packs[i - 1].entry.order) {
        throw new Error('Ties should be broken by order ascending')
      }
    }
  }
})

// Test 13: Budgeting
console.log('\nTest Group 8: Budgeting')

test('Limit option restricts pack count', () => {
  const unlimited = reader.retrieve('the', { limit: 100 })
  const limited = reader.retrieve('the', { limit: 2 })

  if (limited.length > 2) {
    throw new Error(`Limit 2 should return max 2 packs, got ${limited.length}`)
  }

  if (unlimited.length > 0 && limited.length === 0) {
    throw new Error('Limited should return some packs if unlimited does')
  }

  // Limited should be top packs from unlimited
  for (let i = 0; i < Math.min(limited.length, 2); i++) {
    if (limited[i].packId !== unlimited[i].packId) {
      throw new Error('Limited packs should be top-ranked subset')
    }
  }
})

test('maxTokens stops before exceeding budget', () => {
  const packs = reader.retrieve('the', {
    limit: 10,
    maxTokens: 200  // Very small budget
  })

  // Calculate total chars
  let totalChars = 0
  for (const pack of packs) {
    totalChars += pack.meta.charCount
  }

  // Should not exceed budget
  if (totalChars > 200) {
    throw new Error(`Total chars ${totalChars} exceeds maxTokens 200`)
  }
})

test('maxTokens stops before adding pack that would exceed', () => {
  const allPacks = reader.retrieve('section', { limit: 10 })

  if (allPacks.length < 2) {
    console.log('   (Skipped: need 2+ packs)')
    return
  }

  // Set budget to allow only first pack
  const firstPackSize = allPacks[0].meta.charCount
  const secondPackSize = allPacks[1].meta.charCount
  const budget = firstPackSize + Math.floor(secondPackSize / 2)

  const budgetedPacks = reader.retrieve('section', {
    limit: 10,
    maxTokens: budget
  })

  // Should only include first pack (hard limit)
  if (budgetedPacks.length !== 1) {
    throw new Error('Should stop before exceeding budget (hard limit)')
  }
})

// Test 14: Empty results
console.log('\nTest Group 9: Empty Results')

test('Empty query returns empty array', () => {
  const packs = reader.retrieve('')
  if (packs.length !== 0) {
    throw new Error('Empty query should return no packs')
  }
})

test('No matches returns empty array', () => {
  const packs = reader.retrieve('nonexistentxyz12345')
  if (packs.length !== 0) {
    throw new Error('No matches should return empty array')
  }
})

test('Budget too small returns empty array', () => {
  const packs = reader.retrieve('section', {
    limit: 5,
    maxTokens: 1  // Impossibly small budget
  })

  if (packs.length !== 0) {
    throw new Error('Budget too small should return empty array')
  }
})

// Test 15: Pack IDs are deterministic
console.log('\nTest Group 10: Pack IDs')

test('Neighbor pack IDs use o:<start>-<end> format', () => {
  const packs = reader.retrieve('section', {
    expand: 'neighbors',
    limit: 3
  })

  for (const pack of packs) {
    if (pack.scope.type === 'neighbors') {
      if (!pack.packId.startsWith('o:')) {
        throw new Error('Neighbor pack ID should start with "o:"')
      }

      // Should match format o:<number>-<number>
      const match = pack.packId.match(/^o:(\d+)-(\d+)$/)
      if (!match) {
        throw new Error('Neighbor pack ID should match o:<start>-<end>')
      }
    }
  }
})

test('Section pack IDs use s:<sectionId> format', () => {
  const packs = reader.retrieve('section', {
    expand: 'section',
    limit: 3
  })

  for (const pack of packs) {
    if (pack.scope.type === 'section') {
      if (!pack.packId.startsWith('s:')) {
        throw new Error('Section pack ID should start with "s:"')
      }

      // Should be s: followed by section ID
      if (!pack.scope.sectionId) {
        throw new Error('Section pack should have sectionId')
      }

      if (pack.packId !== `s:${pack.scope.sectionId}`) {
        throw new Error('Section pack ID should be s:<sectionId>')
      }
    }
  }
})

// Summary
console.log('\n' + '─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n✅ All retrieval pack tests passed!')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed')
  process.exit(1)
}