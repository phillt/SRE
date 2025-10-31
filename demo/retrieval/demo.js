#!/usr/bin/env node

/**
 * Demo script showing retrieval packs functionality
 */

import { createReader } from '../../dist/runtime/api/index.js'

async function demo() {
  console.log('📦 SRE Retrieval Packs Demo\n')

  // Load artifacts
  console.log('Loading artifacts from dist/final-test...')
  const reader = await createReader('dist/final-test')
  console.log('✅ Loaded successfully\n')

  // Show document info
  const manifest = reader.getManifest()
  console.log(`Document: ${manifest.title} (${manifest.spanCount} spans)\n`)

  // Example 1: Basic retrieval with neighbors
  console.log('─'.repeat(60))
  console.log('Example 1: Basic Retrieval with Neighbors')
  console.log('─'.repeat(60))

  const query1 = 'section'
  console.log(`Query: "${query1}"`)
  console.log('Options: { limit: 2, perHitNeighbors: 1, expand: "neighbors" }\n')

  const packs1 = reader.retrieve(query1, {
    limit: 2,
    perHitNeighbors: 1,
    expand: 'neighbors'
  })

  console.log(`Found ${packs1.length} retrieval pack(s):\n`)

  for (let i = 0; i < packs1.length; i++) {
    const pack = packs1[i]
    console.log(`Pack ${i + 1}:`)
    console.log(`  Pack ID: ${pack.packId}`)
    console.log(`  Entry: ${pack.entry.spanId} (score: ${pack.entry.score.toFixed(4)}, order: ${pack.entry.order})`)
    console.log(`  Scope: ${pack.scope.type}`)
    if (pack.scope.range) {
      console.log(`  Range: orders ${pack.scope.range.start}-${pack.scope.range.end}`)
    }
    console.log(`  Paragraphs: ${pack.paragraphIds.length} spans`)
    console.log(`  Chars: ${pack.meta.charCount}`)
    console.log(`  Heading: [${pack.meta.headingPath.join(' > ')}]`)
    console.log(`  Text preview: "${pack.text.substring(0, 80)}..."\n`)
  }

  // Example 2: Section expansion
  console.log('─'.repeat(60))
  console.log('Example 2: Section Expansion')
  console.log('─'.repeat(60))

  const query2 = 'section'
  console.log(`Query: "${query2}"`)
  console.log('Options: { limit: 2, expand: "section" }\n')

  const packs2 = reader.retrieve(query2, {
    limit: 2,
    expand: 'section'
  })

  console.log(`Found ${packs2.length} retrieval pack(s):\n`)

  for (let i = 0; i < packs2.length; i++) {
    const pack = packs2[i]
    console.log(`Pack ${i + 1}:`)
    console.log(`  Pack ID: ${pack.packId}`)
    console.log(`  Entry: ${pack.entry.spanId} (score: ${pack.entry.score.toFixed(4)})`)
    console.log(`  Scope: ${pack.scope.type}`)
    if (pack.scope.sectionId) {
      console.log(`  Section: ${pack.scope.sectionId}`)
    }
    console.log(`  Paragraphs: ${pack.paragraphIds.length} spans (full section)`)
    console.log(`  Chars: ${pack.meta.charCount}`)
    console.log(`  Heading: [${pack.meta.headingPath.join(' > ')}]`)
    const preview = pack.text.length > 100 ? pack.text.substring(0, 100) + '...' : pack.text
    console.log(`  Text preview: "${preview}"\n`)
  }

  // Example 3: TF-IDF ranking
  console.log('─'.repeat(60))
  console.log('Example 3: TF-IDF Ranking')
  console.log('─'.repeat(60))

  const query3 = 'paragraph'
  console.log(`Query: "${query3}"`)
  console.log('Options: { limit: 3, rank: "tfidf", perHitNeighbors: 0 }\n')

  const packs3 = reader.retrieve(query3, {
    limit: 3,
    rank: 'tfidf',
    perHitNeighbors: 0  // Just the hit itself
  })

  console.log(`Found ${packs3.length} pack(s), ranked by TF-IDF:\n`)

  for (let i = 0; i < packs3.length; i++) {
    const pack = packs3[i]
    console.log(`${i + 1}. Score: ${pack.entry.score.toFixed(4)}`)
    console.log(`   Span: ${pack.entry.spanId} (order: ${pack.entry.order})`)
    console.log(`   Text: "${pack.text.substring(0, 60)}..."`)
    console.log()
  }

  // Example 4: Budget constraints
  console.log('─'.repeat(60))
  console.log('Example 4: Budget Constraints')
  console.log('─'.repeat(60))

  const query4 = 'the'
  console.log(`Query: "${query4}" (common word, many hits)\n`)

  // Without budget
  const unlimited = reader.retrieve(query4, {
    limit: 10,
    perHitNeighbors: 1
  })
  console.log(`Without maxTokens: ${unlimited.length} packs`)

  let totalChars = 0
  for (const pack of unlimited) {
    totalChars += pack.meta.charCount
  }
  console.log(`  Total characters: ${totalChars}\n`)

  // With character budget
  const budget = 500
  const budgeted = reader.retrieve(query4, {
    limit: 10,
    perHitNeighbors: 1,
    maxTokens: budget
  })

  console.log(`With maxTokens=${budget}: ${budgeted.length} packs`)

  let budgetedChars = 0
  for (const pack of budgeted) {
    budgetedChars += pack.meta.charCount
  }
  console.log(`  Total characters: ${budgetedChars} (≤ ${budget})\n`)

  // Example 5: Deduplication
  console.log('─'.repeat(60))
  console.log('Example 5: Deduplication of Overlapping Contexts')
  console.log('─'.repeat(60))

  const query5 = 'nested'
  console.log(`Query: "${query5}"`)
  console.log('Options: { limit: 10, perHitNeighbors: 3 } (large overlap)\n')

  const packs5 = reader.retrieve(query5, {
    limit: 10,
    perHitNeighbors: 3,
    expand: 'neighbors'
  })

  console.log(`Found ${packs5.length} pack(s) after deduplication\n`)

  for (let i = 0; i < packs5.length; i++) {
    const pack = packs5[i]
    console.log(`Pack ${i + 1}:`)
    console.log(`  Pack ID: ${pack.packId}`)
    console.log(`  Range: ${pack.scope.range ? `orders ${pack.scope.range.start}-${pack.scope.range.end}` : 'N/A'}`)
    console.log(`  Merged ${pack.paragraphIds.length} spans`)
    console.log()
  }

  // Example 6: Compare search() vs retrieve()
  console.log('─'.repeat(60))
  console.log('Example 6: Search vs Retrieve')
  console.log('─'.repeat(60))

  const query6 = 'section'
  console.log(`Query: "${query6}"\n`)

  // Plain search
  const searchResults = reader.search(query6, { limit: 3, rank: 'tfidf' })
  console.log(`search(): ${searchResults.length} spans`)
  console.log('  Returns: Individual paragraph spans')
  console.log('  Use case: Finding specific mentions\n')

  // Retrieval packs
  const retrieveResults = reader.retrieve(query6, { limit: 3, expand: 'neighbors' })
  console.log(`retrieve(): ${retrieveResults.length} packs`)
  console.log('  Returns: Context blocks with neighbors')
  console.log('  Use case: Providing LLM context\n')

  console.log('Key differences:')
  console.log('  • search() returns individual spans')
  console.log('  • retrieve() returns expanded context packs')
  console.log('  • retrieve() deduplicates overlapping contexts')
  console.log('  • retrieve() applies budget constraints\n')

  // Example 7: Plain text (no sections)
  console.log('─'.repeat(60))
  console.log('Example 7: Plain Text (No Section Structure)')
  console.log('─'.repeat(60))

  console.log('Loading plain text corpus...')
  const txtReader = await createReader('dist/test-txt')
  console.log('✅ Loaded\n')

  const query7 = 'paragraph'
  console.log(`Query: "${query7}"`)
  console.log('Options: { limit: 2, expand: "section" } (will fallback)\n')

  const packs7 = txtReader.retrieve(query7, {
    limit: 2,
    expand: 'section'  // Requested section but plain text has no structure
  })

  console.log(`Found ${packs7.length} pack(s) (fallback to neighbors):\n`)

  for (const pack of packs7) {
    console.log(`  Pack ID: ${pack.packId}`)
    console.log(`  Scope: ${pack.scope.type} (automatically fell back)`)
    console.log(`  Spans: ${pack.paragraphIds.length}`)
    console.log()
  }

  // Example 8: Practical LLM use case
  console.log('─'.repeat(60))
  console.log('Example 8: Practical LLM Use Case')
  console.log('─'.repeat(60))

  const llmQuery = 'bullet'
  console.log(`User question: "Tell me about bullet points"`)
  console.log(`Query: "${llmQuery}"\n`)

  const llmPacks = reader.retrieve(llmQuery, {
    limit: 3,
    perHitNeighbors: 1,
    maxTokens: 1000,
    rank: 'tfidf'
  })

  console.log(`Retrieved ${llmPacks.length} context block(s) for LLM:\n`)

  for (let i = 0; i < llmPacks.length; i++) {
    const pack = llmPacks[i]
    console.log(`Context Block ${i + 1}:`)
    console.log(`  Relevance: ${pack.entry.score.toFixed(4)}`)
    console.log(`  Location: ${pack.entry.headingPath.join(' > ') || '(root)'}`)
    console.log(`  Size: ${pack.meta.charCount} chars, ${pack.meta.spanCount} paragraphs`)
    console.log(`\n  Text:\n  ${pack.text.split('\n\n').map(p => `  ${p}`).join('\n\n  ')}\n`)
    console.log('─'.repeat(40))
  }

  console.log('\n✨ Demo complete!')
  console.log('\nKey Takeaways:')
  console.log('  • retrieve() transforms search hits into LLM-ready context')
  console.log('  • Automatically expands to neighbors or sections')
  console.log('  • Deduplicates overlapping contexts')
  console.log('  • Respects budget constraints (limit, maxTokens)')
  console.log('  • Returns deterministic, reproducible results')
}

demo().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})