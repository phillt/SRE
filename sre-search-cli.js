#!/usr/bin/env node

/**
 * Simple CLI search tool using SRE Reader
 *
 * Usage:
 *   node sre-search-cli.js <output-dir> <query> [--limit=N]
 *
 * Examples:
 *   node sre-search-cli.js dist/final-test "section"
 *   node sre-search-cli.js dist/final-test "section two"
 *   node sre-search-cli.js dist/final-test "error" --limit=5
 */

import { createReader } from './dist/runtime/api/index.js'

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: sre-search-cli.js <output-dir> <query> [--limit=N]')
  console.error('\nExamples:')
  console.error('  sre-search-cli.js dist/final-test "section"')
  console.error('  sre-search-cli.js dist/final-test "section two"')
  console.error('  sre-search-cli.js dist/final-test "error" --limit=5')
  process.exit(1)
}

const outputDir = args[0]
const query = args[1]

// Parse --limit flag
let limit
const limitArg = args.find(arg => arg.startsWith('--limit='))
if (limitArg) {
  limit = parseInt(limitArg.split('=')[1], 10)
  if (isNaN(limit)) {
    console.error('Error: --limit must be a number')
    process.exit(1)
  }
}

async function main() {
  // Load reader
  console.error(`Loading corpus from ${outputDir}...`)
  const reader = await createReader(outputDir)

  const manifest = reader.getManifest()
  console.error(`Loaded: ${manifest.title} (${manifest.spanCount} spans)`)
  console.error(`Searching for: "${query}"`)
  if (limit) {
    console.error(`Limit: ${limit} results`)
  }
  console.error()

  // Perform search
  const options = limit ? { limit } : undefined
  const results = reader.search(query, options)

  if (results.length === 0) {
    console.error('No results found.')
    process.exit(0)
  }

  console.error(`Found ${results.length} result(s):\n`)

  // Display results
  for (const span of results) {
    // Header
    console.log(`╭─ ${span.id} (order: ${span.meta.order})`)

    // Heading path if available
    if (span.meta.headingPath.length > 0) {
      console.log(`│  Path: ${span.meta.headingPath.join(' → ')}`)
    }

    // Text (with wrapping for long lines)
    const maxWidth = 70
    const lines = wrapText(span.text, maxWidth)
    console.log('│')
    for (const line of lines) {
      console.log(`│  ${line}`)
    }
    console.log('╰' + '─'.repeat(maxWidth + 3))
    console.log()
  }

  console.error(`\nShowing ${results.length} of ${results.length} results`)
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(text, maxWidth) {
  const lines = []
  let currentLine = ''

  // Replace newlines with spaces for display
  const normalized = text.replace(/\n/g, ' ')

  const words = normalized.split(' ')

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine.length > 0 ? ' ' : '') + word
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine)
      }
      // Handle very long words
      if (word.length > maxWidth) {
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.substring(i, i + maxWidth))
        }
        currentLine = ''
      } else {
        currentLine = word
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
}

main().catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
})
