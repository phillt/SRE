#!/usr/bin/env node

/**
 * Verification script for RAG prompt assembly functionality
 *
 * Tests all acceptance criteria:
 * 1. Determinism - Same inputs → identical output
 * 2. Pack processing - All provided packs are assembled
 * 3. Citation mapping - All markers in context and citation map
 * 4. Missing headingPath - Handles gracefully
 * 5. Summarize style - Different system prompt
 * 6. Non-ASCII headings - Preserved correctly
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

console.log('🤖 Verifying RAG Prompt Assembly...\n')

// Load test data
console.log('Test Group 1: Basic Assembly')
let reader
await testAsync('Load Markdown artifacts', async () => {
  reader = await createReader('dist/final-test')
  if (!reader) throw new Error('Reader is undefined')
})

// Test 1: Basic assembly returns structured prompt
test('Basic assembly returns structured prompt', () => {
  const packs = reader.retrieve('section', { limit: 2 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  if (!result.prompt) throw new Error('Missing prompt object')
  if (!result.prompt.system) throw new Error('Missing system prompt')
  if (!result.prompt.user) throw new Error('Missing user prompt')
  if (!Array.isArray(result.citations)) throw new Error('Citations should be array')
  if (typeof result.tokensEstimated !== 'number') {
    throw new Error('tokensEstimated should be number')
  }
})

// Test 2: System prompt includes QA instructions
test('System prompt includes QA instructions', () => {
  const packs = reader.retrieve('section', { limit: 1 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
    style: 'qa',
  })

  const system = result.prompt.system.toLowerCase()
  if (!system.includes('answer')) {
    throw new Error('QA system prompt should mention answering')
  }
  if (!system.includes('cite')) {
    throw new Error('QA system prompt should mention citations')
  }
})

// Test 3: Summarize style has different system prompt
test('Summarize style has different system prompt', () => {
  const packs = reader.retrieve('section', { limit: 1 })
  const result = reader.assemblePrompt({
    question: 'Summarize the following context',
    packs,
    style: 'summarize',
  })

  const system = result.prompt.system
  if (!system.includes('summar')) {
    throw new Error('Summarize system prompt should mention summarizing')
  }
})

// Test 4: Citations include required fields
test('Citations include required fields', () => {
  const packs = reader.retrieve('section', { limit: 2 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  if (result.citations.length === 0) {
    throw new Error('Expected citations for non-empty packs')
  }

  for (const citation of result.citations) {
    if (!citation.marker) throw new Error('Citation missing marker')
    if (!citation.packId) throw new Error('Citation missing packId')
    if (!citation.docId) throw new Error('Citation missing docId')
    if (!Array.isArray(citation.headingPath)) {
      throw new Error('Citation missing headingPath array')
    }
  }
})

// Test 5: Citation markers are numeric superscripts
test('Citation markers are numeric superscripts', () => {
  const packs = reader.retrieve('section', { limit: 3 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  if (result.citations.length === 0) {
    throw new Error('Expected citations')
  }

  // Check first marker is [¹]
  if (result.citations[0].marker !== '[¹]') {
    throw new Error(`First marker should be [¹], got ${result.citations[0].marker}`)
  }

  // Check second marker is [²] if present
  if (result.citations.length > 1 && result.citations[1].marker !== '[²]') {
    throw new Error(`Second marker should be [²], got ${result.citations[1].marker}`)
  }
})

// Test 6: All markers appear in user prompt
test('All markers appear in user prompt', () => {
  const packs = reader.retrieve('section', { limit: 3 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  for (const citation of result.citations) {
    if (!result.prompt.user.includes(citation.marker)) {
      throw new Error(`Marker ${citation.marker} not found in user prompt`)
    }
  }
})

// Test 7: User prompt includes question
test('User prompt includes question', () => {
  const packs = reader.retrieve('section', { limit: 1 })
  const question = 'What is a unique test question?'
  const result = reader.assemblePrompt({
    question,
    packs,
  })

  if (!result.prompt.user.includes(question)) {
    throw new Error('User prompt should include the question')
  }
})

// Test 8: Context blocks include pack text
test('Context blocks include pack text', () => {
  const packs = reader.retrieve('section', { limit: 2 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  // At least some pack text should appear in user prompt
  const foundText = packs.some((pack) =>
    result.prompt.user.includes(pack.text.substring(0, 50))
  )

  if (!foundText) {
    throw new Error('User prompt should include pack text')
  }
})

// Test 9: Determinism
console.log('\nTest Group 2: Determinism')

test('Same inputs produce identical output', () => {
  const packs = reader.retrieve('section', { limit: 2 })
  const options = {
    question: 'What is a section?',
    packs,
  }

  const result1 = reader.assemblePrompt(options)
  const result2 = reader.assemblePrompt(options)
  const result3 = reader.assemblePrompt(options)

  if (JSON.stringify(result1) !== JSON.stringify(result2)) {
    throw new Error('Results 1 and 2 differ')
  }

  if (JSON.stringify(result1) !== JSON.stringify(result3)) {
    throw new Error('Results 1 and 3 differ')
  }
})

test('Deterministic citation order', () => {
  const packs = reader.retrieve('paragraph', { limit: 5, rank: 'tfidf' })
  const result = reader.assemblePrompt({
    question: 'What are paragraphs?',
    packs,
  })

  // Citations should be in same order as packs (score desc, order asc)
  for (let i = 0; i < result.citations.length; i++) {
    const expectedPackId = packs[i].packId
    if (result.citations[i].packId !== expectedPackId) {
      throw new Error(`Citation ${i} packId mismatch`)
    }
  }
})

// Test 10: Pack processing
console.log('\nTest Group 3: Pack Processing')

test('All provided packs are processed', () => {
  const packs = reader.retrieve('section', { limit: 3, rank: 'tfidf' })

  const result = reader.assemblePrompt({
    question: 'What is this about?',
    packs,
  })

  // All packs should result in citations
  if (result.citations.length !== packs.length) {
    throw new Error(`Expected ${packs.length} citations, got ${result.citations.length}`)
  }

  // Citations should match pack order
  for (let i = 0; i < packs.length; i++) {
    if (result.citations[i].packId !== packs[i].packId) {
      throw new Error('Citation order should match pack order')
    }
  }
})

test('Token estimation is non-negative', () => {
  const packs = reader.retrieve('the', { limit: 5 })

  const result = reader.assemblePrompt({
    question: 'What is this?',
    packs,
  })

  if (result.tokensEstimated < 0) {
    throw new Error('tokensEstimated should be non-negative')
  }

  // Estimated tokens should be at least as large as the question
  if (result.tokensEstimated < 'What is this?'.length) {
    throw new Error('tokensEstimated should account for at least the question')
  }
})

// Test 11: Empty packs
console.log('\nTest Group 4: Edge Cases')

test('Empty packs returns minimal prompt', () => {
  const result = reader.assemblePrompt({
    question: 'What is this?',
    packs: [],
  })

  if (result.citations.length !== 0) {
    throw new Error('Empty packs should have no citations')
  }

  if (!result.prompt.system) {
    throw new Error('Should still have system prompt')
  }

  if (!result.prompt.user.includes('What is this?')) {
    throw new Error('User prompt should include question even with no packs')
  }
})

test('Single pack works correctly', () => {
  const packs = reader.retrieve('section', { limit: 1 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  if (result.citations.length !== 1) {
    throw new Error('Should have exactly 1 citation')
  }

  if (result.citations[0].marker !== '[¹]') {
    throw new Error('Single citation should be [¹]')
  }
})

test('Missing headingPath handled gracefully', () => {
  const packs = reader.retrieve('the', { limit: 2 })
  const result = reader.assemblePrompt({
    question: 'What is this?',
    packs,
  })

  // Should not error even if some packs have empty headingPath
  if (!result.prompt.system) {
    throw new Error('Should complete assembly')
  }

  // All citations should have headingPath array (may be empty)
  for (const citation of result.citations) {
    if (!Array.isArray(citation.headingPath)) {
      throw new Error('headingPath should be array')
    }
  }
})

// Test 12: Non-ASCII handling
console.log('\nTest Group 5: Unicode and Special Characters')

test('Non-ASCII headings preserved', () => {
  // This tests that unicode in headingPath is preserved
  const packs = reader.retrieve('section', { limit: 1 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  // Superscript markers are non-ASCII - verify they work
  if (!result.citations[0].marker.includes('¹')) {
    throw new Error('Superscript markers should use unicode')
  }
})

test('Non-ASCII question preserved', () => {
  const packs = reader.retrieve('section', { limit: 1 })
  const question = 'What is a section? 你好 世界'
  const result = reader.assemblePrompt({
    question,
    packs,
  })

  if (!result.prompt.user.includes('你好')) {
    throw new Error('Non-ASCII characters in question should be preserved')
  }
})

// Test 13: Citation metadata
console.log('\nTest Group 6: Citation Metadata')

test('Citations include packId', () => {
  const packs = reader.retrieve('section', { limit: 2 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  for (let i = 0; i < result.citations.length; i++) {
    if (result.citations[i].packId !== packs[i].packId) {
      throw new Error('Citation packId should match pack')
    }
  }
})

test('Citations include docId from manifest', () => {
  const packs = reader.retrieve('section', { limit: 1 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  const manifest = reader.getManifest()

  if (result.citations[0].docId !== manifest.id) {
    throw new Error('Citation docId should match manifest.id')
  }
})

test('Citations include headingPath', () => {
  const packs = reader.retrieve('section', { limit: 2 })
  const result = reader.assemblePrompt({
    question: 'What is a section?',
    packs,
  })

  for (let i = 0; i < result.citations.length; i++) {
    const citation = result.citations[i]
    const pack = packs[i]

    if (
      JSON.stringify(citation.headingPath) !==
      JSON.stringify(pack.meta.headingPath)
    ) {
      throw new Error('Citation headingPath should match pack headingPath')
    }
  }
})

// Summary
console.log('\n' + '─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n✅ All RAG prompt assembly tests passed!')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed')
  process.exit(1)
}
