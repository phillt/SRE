#!/usr/bin/env node

/**
 * Verification script for format tracking feature
 *
 * Tests that format, detection, and reader fields are correctly recorded
 * in both manifest.json and buildReport.json
 */

import { execSync } from 'child_process'
import { readFileSync, rmSync, existsSync } from 'fs'

const TESTS = [
  {
    name: 'Auto-detection with .md file',
    command: 'node dist/cli/index.js demo/test-input/sample.md -o dist/test-auto',
    outputDir: 'dist/test-auto',
    expectedManifest: {
      format: 'md',
      detection: 'auto',
      reader: 'text',
    },
    expectedProvenance: {
      format: 'md',
      detection: 'auto',
    },
  },
  {
    name: 'Explicit format with --format md',
    command: 'node dist/cli/index.js demo/test-input/sample.md --format md -o dist/test-explicit',
    outputDir: 'dist/test-explicit',
    expectedManifest: {
      format: 'md',
      detection: 'flag',
      reader: 'text',
    },
    expectedProvenance: {
      format: 'md',
      detection: 'flag',
    },
  },
  {
    name: 'Format override on .txt with --format markdown',
    command: 'node dist/cli/index.js demo/test-input/sample.txt --format markdown -o dist/test-override',
    outputDir: 'dist/test-override',
    expectedManifest: {
      format: 'markdown',
      detection: 'flag',
      reader: 'text',
    },
    expectedProvenance: {
      format: 'markdown',
      detection: 'flag',
    },
  },
]

let passed = 0
let failed = 0

console.log('🔍 Verifying format tracking feature...\n')

for (const test of TESTS) {
  console.log(`Testing: ${test.name}`)

  // Clean output directory
  if (existsSync(test.outputDir)) {
    rmSync(test.outputDir, { recursive: true })
  }

  try {
    // Run command
    execSync(test.command, { stdio: 'pipe' })

    // Read manifest.json
    const manifestPath = `${test.outputDir}/manifest.json`
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    // Read buildReport.json
    const reportPath = `${test.outputDir}/buildReport.json`
    const report = JSON.parse(readFileSync(reportPath, 'utf-8'))

    // Verify manifest fields
    const manifestOk =
      manifest.format === test.expectedManifest.format &&
      manifest.detection === test.expectedManifest.detection &&
      manifest.reader === test.expectedManifest.reader

    // Verify report provenance fields
    const provenanceOk =
      report.provenance.format === test.expectedProvenance.format &&
      report.provenance.detection === test.expectedProvenance.detection

    if (manifestOk && provenanceOk) {
      console.log('  ✅ PASS')
      console.log(`     manifest: format="${manifest.format}" detection="${manifest.detection}" reader="${manifest.reader}"`)
      console.log(`     provenance: format="${report.provenance.format}" detection="${report.provenance.detection}"`)
      passed++
    } else {
      console.log('  ❌ FAIL')
      if (!manifestOk) {
        console.log('     Manifest mismatch:')
        console.log(`       Expected: ${JSON.stringify(test.expectedManifest)}`)
        console.log(`       Got: format="${manifest.format}" detection="${manifest.detection}" reader="${manifest.reader}"`)
      }
      if (!provenanceOk) {
        console.log('     Provenance mismatch:')
        console.log(`       Expected: ${JSON.stringify(test.expectedProvenance)}`)
        console.log(`       Got: format="${report.provenance.format}" detection="${report.provenance.detection}"`)
      }
      failed++
    }
  } catch (error) {
    console.log('  ❌ FAIL')
    console.log(`     Error: ${error.message}`)
    failed++
  }

  console.log()
}

console.log('─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n✅ All format tracking tests passed!')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed')
  process.exit(1)
}
