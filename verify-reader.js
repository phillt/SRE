#!/usr/bin/env node

/**
 * Verification script for runtime Reader
 *
 * Tests all acceptance criteria:
 * 1. Load Markdown output (with nodeMap)
 * 2. Manifest access
 * 3. Span count matches
 * 4. getByOrder() works
 * 5. neighbors() works correctly
 * 6. Section methods work
 * 7. Plain TXT graceful degradation
 * 8. Error handling
 */

import { createReader } from './dist/runtime/api/index.js'
import { existsSync, rmSync } from 'fs'

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

console.log('🔍 Verifying Runtime Reader...\n')

// Test 1: Load Markdown output (with nodeMap)
console.log('Test Group 1: Markdown with NodeMap')
let mdReader
await testAsync('Load Markdown artifacts', async () => {
  mdReader = await createReader('dist/final-test')
  if (!mdReader) throw new Error('Reader is undefined')
})

// Test 2: Manifest access
test('getManifest() returns correct data', () => {
  const manifest = mdReader.getManifest()
  if (!manifest.id) throw new Error('Missing manifest.id')
  if (!manifest.title) throw new Error('Missing manifest.title')
  if (!manifest.format) throw new Error('Missing manifest.format')
  if (manifest.format !== 'md') throw new Error(`Expected format='md', got '${manifest.format}'`)
})

// Test 3: Span count matches
test('getSpanCount() equals manifest.spanCount', () => {
  const manifest = mdReader.getManifest()
  const count = mdReader.getSpanCount()
  if (count !== manifest.spanCount) {
    throw new Error(`Expected ${manifest.spanCount}, got ${count}`)
  }
  if (count !== 9) {
    throw new Error(`Expected 9 spans for sample.md, got ${count}`)
  }
})

// Test 4: getByOrder() works
test('getByOrder(0) returns first span', () => {
  const firstSpan = mdReader.getByOrder(0)
  if (!firstSpan) throw new Error('First span is undefined')
  if (firstSpan.meta.order !== 0) {
    throw new Error(`Expected order=0, got ${firstSpan.meta.order}`)
  }
  if (!firstSpan.text.startsWith('# Sample')) {
    throw new Error(`Unexpected first span text: ${firstSpan.text}`)
  }
})

test('getByOrder() out of range returns undefined', () => {
  const span = mdReader.getByOrder(999)
  if (span !== undefined) {
    throw new Error('Expected undefined for out-of-range order')
  }
})

// Test 5: neighbors() works
test('neighbors() with after=2 returns 3 IDs', () => {
  const firstSpan = mdReader.getByOrder(0)
  const neighborIds = mdReader.neighbors(firstSpan.id, { after: 2 })
  if (neighborIds.length !== 3) {
    throw new Error(`Expected 3 IDs, got ${neighborIds.length}`)
  }
  // Should be: span:000001, span:000002, span:000003
  if (neighborIds[0] !== firstSpan.id) {
    throw new Error('First neighbor should be the target span')
  }
})

test('neighbors() at last span with before=2 works', () => {
  const lastSpan = mdReader.getByOrder(8) // 9 spans, 0-8
  const neighborIds = mdReader.neighbors(lastSpan.id, { before: 2 })
  if (neighborIds.length !== 3) {
    throw new Error(`Expected 3 IDs, got ${neighborIds.length}`)
  }
  // Should be: span:000007, span:000008, span:000009
  if (neighborIds[neighborIds.length - 1] !== lastSpan.id) {
    throw new Error('Last neighbor should be the target span')
  }
})

test('neighbors() in middle returns correct range', () => {
  const middleSpan = mdReader.getByOrder(4) // Middle of 9 spans
  const neighborIds = mdReader.neighbors(middleSpan.id, { before: 1, after: 1 })
  if (neighborIds.length !== 3) {
    throw new Error(`Expected 3 IDs, got ${neighborIds.length}`)
  }
  // Should be: span:000004, span:000005, span:000006
  if (neighborIds[1] !== middleSpan.id) {
    throw new Error('Middle neighbor should be the target span')
  }
})

test('neighbors() at boundary returns fewer IDs', () => {
  const firstSpan = mdReader.getByOrder(0)
  const neighborIds = mdReader.neighbors(firstSpan.id, { before: 5, after: 1 })
  // Should only get: span:000001, span:000002 (can't go before 0)
  if (neighborIds.length !== 2) {
    throw new Error(`Expected 2 IDs at boundary, got ${neighborIds.length}`)
  }
})

test('neighbors() with invalid ID returns empty array', () => {
  const neighborIds = mdReader.neighbors('span:999999')
  if (neighborIds.length !== 0) {
    throw new Error('Expected empty array for invalid ID')
  }
})

// Test 6: Section methods (with nodeMap)
test('listSections() returns correct count', () => {
  const sections = mdReader.listSections()
  if (sections.length !== 3) {
    throw new Error(`Expected 3 sections, got ${sections.length}`)
  }
})

test('getSection() returns paragraphIds', () => {
  const sections = mdReader.listSections()
  const firstSection = mdReader.getSection(sections[0])
  if (!firstSection) throw new Error('Section is undefined')
  if (!Array.isArray(firstSection.paragraphIds)) {
    throw new Error('paragraphIds is not an array')
  }
  if (firstSection.paragraphIds.length === 0) {
    throw new Error('Section has no paragraph IDs')
  }
})

test('getSection() with invalid ID returns undefined', () => {
  const section = mdReader.getSection('sec:999999')
  if (section !== undefined) {
    throw new Error('Expected undefined for invalid section ID')
  }
})

test('All section spans exist', () => {
  const sections = mdReader.listSections()
  for (const sectionId of sections) {
    const section = mdReader.getSection(sectionId)
    for (const spanId of section.paragraphIds) {
      const span = mdReader.getSpan(spanId)
      if (!span) {
        throw new Error(`Span ${spanId} in section ${sectionId} not found`)
      }
    }
  }
})

// Test 7: Plain TXT (with synthetic nodeMap)
console.log('\nTest Group 2: Plain TXT with Synthetic NodeMap')
let txtReader
await testAsync('Load TXT artifacts', async () => {
  txtReader = await createReader('dist/test-txt')
  if (!txtReader) throw new Error('Reader is undefined')
})

test('TXT: has synthetic section (1 chapter, 1 section)', () => {
  const sections = txtReader.listSections()
  if (sections.length !== 1) {
    throw new Error(`Expected 1 synthetic section, got ${sections.length}`)
  }
})

test('TXT: synthetic section contains all spans', () => {
  const sections = txtReader.listSections()
  const section = txtReader.getSection(sections[0])
  if (!section) throw new Error('Section is undefined')

  const spanCount = txtReader.getSpanCount()
  if (section.paragraphIds.length !== spanCount) {
    throw new Error(`Expected ${spanCount} spans in section, got ${section.paragraphIds.length}`)
  }
})

test('TXT: Other methods still work', () => {
  const manifest = txtReader.getManifest()
  if (!manifest) throw new Error('Manifest is undefined')

  const count = txtReader.getSpanCount()
  if (count !== 4) throw new Error(`Expected 4 TXT spans, got ${count}`)

  const firstSpan = txtReader.getByOrder(0)
  if (!firstSpan) throw new Error('First span is undefined')
})

test('TXT: has nodeMap (synthetic structure)', () => {
  const nodeMap = txtReader.getNodeMap()
  if (!nodeMap) throw new Error('Expected synthetic nodeMap for TXT')
  if (Object.keys(nodeMap.chapters).length !== 1) {
    throw new Error('Expected 1 synthetic chapter')
  }
})

// Test 8: Error handling
console.log('\nTest Group 3: Error Handling')

await testAsync('Load from non-existent directory throws', async () => {
  try {
    await createReader('dist/does-not-exist')
    throw new Error('Should have thrown')
  } catch (error) {
    if (!error.message.includes('not found')) {
      throw new Error(`Wrong error message: ${error.message}`)
    }
  }
})

// Test 9: getSpan() method
console.log('\nTest Group 4: Additional API Tests')

test('getSpan() returns correct span', () => {
  const span = mdReader.getSpan('span:000001')
  if (!span) throw new Error('Span is undefined')
  if (span.id !== 'span:000001') {
    throw new Error(`Expected span:000001, got ${span.id}`)
  }
})

test('getSpan() with invalid ID returns undefined', () => {
  const span = mdReader.getSpan('span:999999')
  if (span !== undefined) {
    throw new Error('Expected undefined for invalid span ID')
  }
})

test('getNodeMap() returns nodeMap for Markdown', () => {
  const nodeMap = mdReader.getNodeMap()
  if (!nodeMap) throw new Error('NodeMap is undefined for Markdown')
  if (!nodeMap.book) throw new Error('NodeMap missing book')
  if (!nodeMap.chapters) throw new Error('NodeMap missing chapters')
})

test('getNodeMap() returns synthetic nodeMap for TXT', () => {
  const nodeMap = txtReader.getNodeMap()
  if (!nodeMap) throw new Error('Expected synthetic nodeMap for TXT')
  if (!nodeMap.book) throw new Error('NodeMap missing book')
  if (Object.keys(nodeMap.chapters).length !== 1) {
    throw new Error('Expected 1 synthetic chapter in TXT')
  }
})

test('getBuildReport() returns report', () => {
  const report = mdReader.getBuildReport()
  if (!report) throw new Error('BuildReport is undefined')
  if (!report.summary) throw new Error('BuildReport missing summary')
})

// Test 10: Verify read-only (no mutations)
console.log('\nTest Group 5: Read-Only Verification')

test('Reader is read-only (spans not mutated)', () => {
  const span1 = mdReader.getSpan('span:000001')
  const span2 = mdReader.getSpan('span:000001')

  // Verify we get the same object (or at least same data)
  if (span1.id !== span2.id || span1.text !== span2.text) {
    throw new Error('Span data inconsistent between calls')
  }
})

// Summary
console.log('\n' + '─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n✅ All runtime reader tests passed!')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed')
  process.exit(1)
}
