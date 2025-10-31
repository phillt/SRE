#!/usr/bin/env node

/**
 * Demo script showing RAG prompt assembly functionality
 */

import { createReader } from '../../dist/runtime/api/index.js'

async function demo() {
  console.log('🤖 SRE RAG Prompt Assembly Demo\n')

  // Load artifacts
  console.log('Loading artifacts from dist/final-test...')
  const reader = await createReader('dist/final-test')
  console.log('✅ Loaded successfully\n')

  // Show document info
  const manifest = reader.getManifest()
  console.log(`Document: ${manifest.title}`)
  console.log(`Doc ID: ${manifest.id}`)
  console.log(`Spans: ${manifest.spanCount}\n`)

  // Example 1: Basic QA prompt assembly
  console.log('─'.repeat(70))
  console.log('Example 1: Basic QA Prompt Assembly')
  console.log('─'.repeat(70))

  const query1 = 'section'
  console.log(`Query: "${query1}"`)
  console.log('Style: qa (default)')
  console.log('Retrieving top 2 packs...\n')

  const packs1 = reader.retrieve(query1, {
    limit: 2,
    perHitNeighbors: 1,
    expand: 'neighbors',
    rank: 'tfidf',
  })

  const assembled1 = reader.assemblePrompt({
    question: 'What is a section in this document?',
    packs: packs1,
  })

  console.log(`Citations: ${assembled1.citations.length}`)
  console.log(`Estimated tokens: ${assembled1.tokensEstimated}\n`)

  console.log('System Prompt:')
  console.log(assembled1.prompt.system.substring(0, 150) + '...\n')

  console.log('User Prompt Preview (first 300 chars):')
  console.log(assembled1.prompt.user.substring(0, 300) + '...\n')

  console.log('Citations:')
  for (const citation of assembled1.citations) {
    console.log(`  ${citation.marker} → Pack: ${citation.packId}`)
    console.log(`       Doc: ${citation.docId}`)
    console.log(`       Path: [${citation.headingPath.join(' > ')}]`)
  }
  console.log()

  // Example 2: Summarize style
  console.log('─'.repeat(70))
  console.log('Example 2: Summarize Style')
  console.log('─'.repeat(70))

  const query2 = 'paragraph'
  console.log(`Query: "${query2}"`)
  console.log('Style: summarize')
  console.log('Retrieving top 3 packs...\n')

  const packs2 = reader.retrieve(query2, {
    limit: 3,
    perHitNeighbors: 0,
    rank: 'tfidf',
  })

  const assembled2 = reader.assemblePrompt({
    question: 'Summarize the information about paragraphs',
    packs: packs2,
    style: 'summarize',
  })

  console.log(`Citations: ${assembled2.citations.length}`)
  console.log(`Estimated tokens: ${assembled2.tokensEstimated}\n`)

  console.log('System Prompt:')
  console.log(assembled2.prompt.system + '\n')

  console.log('User Prompt Preview (first 250 chars):')
  console.log(assembled2.prompt.user.substring(0, 250) + '...\n')

  // Example 3: Budget constraints
  console.log('─'.repeat(70))
  console.log('Example 3: Budget Constraints')
  console.log('─'.repeat(70))

  const query3 = 'the'
  console.log(`Query: "${query3}" (common word, many hits)\n`)

  // Retrieve many packs
  const packs3 = reader.retrieve(query3, {
    limit: 10,
    perHitNeighbors: 1,
    rank: 'tfidf',
  })

  console.log(`Retrieved ${packs3.length} packs`)

  // Calculate total size
  let totalChars = 0
  for (const pack of packs3) {
    totalChars += pack.meta.charCount
  }
  console.log(`Total pack chars: ${totalChars}\n`)

  // Without headroom constraint (large headroom)
  const assembled3a = reader.assemblePrompt({
    question: 'What does this document discuss?',
    packs: packs3,
    headroomTokens: 10000, // Very large headroom
  })

  console.log(`Without tight budget: ${assembled3a.citations.length} citations`)
  console.log(`  Estimated tokens: ${assembled3a.tokensEstimated}\n`)

  // With tight headroom constraint
  const assembled3b = reader.assemblePrompt({
    question: 'What does this document discuss?',
    packs: packs3,
    headroomTokens: 100, // Tight headroom
  })

  console.log(`With tight budget (headroom=100): ${assembled3b.citations.length} citations`)
  console.log(`  Estimated tokens: ${assembled3b.tokensEstimated}`)

  // Show which packs were kept
  console.log('  Kept packs (highest scores):')
  for (let i = 0; i < Math.min(3, assembled3b.citations.length); i++) {
    const citation = assembled3b.citations[i]
    const pack = packs3.find((p) => p.packId === citation.packId)
    if (pack) {
      console.log(
        `    ${citation.marker} Score: ${pack.entry.score.toFixed(4)}, Chars: ${pack.meta.charCount}`
      )
    }
  }
  console.log()

  // Example 4: Section expansion with full context
  console.log('─'.repeat(70))
  console.log('Example 4: Section Expansion')
  console.log('─'.repeat(70))

  const query4 = 'section'
  console.log(`Query: "${query4}"`)
  console.log('Expansion: section (full sections)\n')

  const packs4 = reader.retrieve(query4, {
    limit: 2,
    expand: 'section',
    rank: 'tfidf',
  })

  const assembled4 = reader.assemblePrompt({
    question: 'Explain sections in this document',
    packs: packs4,
  })

  console.log(`Citations: ${assembled4.citations.length}`)
  console.log(`Estimated tokens: ${assembled4.tokensEstimated}\n`)

  console.log('Citation details:')
  for (const citation of assembled4.citations) {
    const pack = packs4.find((p) => p.packId === citation.packId)
    if (pack) {
      console.log(`  ${citation.marker} Pack: ${citation.packId}`)
      console.log(`       Scope: ${pack.scope.type}`)
      if (pack.scope.sectionId) {
        console.log(`       Section: ${pack.scope.sectionId}`)
      }
      console.log(`       Paragraphs: ${pack.paragraphIds.length}`)
      console.log(`       Chars: ${pack.meta.charCount}`)
    }
  }
  console.log()

  // Example 5: Full prompt display
  console.log('─'.repeat(70))
  console.log('Example 5: Complete Prompt Structure')
  console.log('─'.repeat(70))

  const query5 = 'paragraph'
  const packs5 = reader.retrieve(query5, {
    limit: 2,
    perHitNeighbors: 0,
    rank: 'tfidf',
  })

  const assembled5 = reader.assemblePrompt({
    question: 'How are paragraphs structured?',
    packs: packs5,
  })

  console.log('SYSTEM:')
  console.log(assembled5.prompt.system)
  console.log()

  console.log('USER:')
  console.log(assembled5.prompt.user)
  console.log()

  console.log('CITATIONS:')
  console.log(JSON.stringify(assembled5.citations, null, 2))
  console.log()

  console.log('─'.repeat(70))
  console.log('Demo complete!')
  console.log('─'.repeat(70))
}

demo().catch((error) => {
  console.error('Demo failed:', error)
  process.exit(1)
})
