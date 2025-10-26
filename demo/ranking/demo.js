#!/usr/bin/env node

/**
 * Demo script showing TF-IDF relevance ranking functionality
 */

import { createReader } from '../../dist/runtime/api/index.js'

async function demo() {
  console.log('🎯 SRE TF-IDF Ranking Demo\n')

  // Load artifacts
  console.log('Loading artifacts from dist/final-test...')
  const reader = await createReader('dist/final-test')
  console.log('✅ Loaded successfully\n')

  // Show document info
  const manifest = reader.getManifest()
  console.log(`Document: ${manifest.title} (${manifest.spanCount} spans)\n`)

  // Example 1: Unranked vs Ranked
  console.log('─'.repeat(60))
  console.log('Example 1: Unranked vs Ranked Results')
  console.log('─'.repeat(60))

  const query = 'section'
  console.log(`Query: "${query}"\n`)

  // Unranked (document order)
  const unranked = reader.search(query)
  console.log(`Unranked (document order): ${unranked.length} results\n`)
  for (let i = 0; i < Math.min(3, unranked.length); i++) {
    const span = unranked[i]
    const preview = span.text.length > 40 ? span.text.substring(0, 40) + '...' : span.text
    console.log(`  ${i + 1}. ${span.id} (order: ${span.meta.order})`)
    console.log(`     "${preview}"`)
  }
  console.log()

  // Ranked (TF-IDF)
  const ranked = reader.search(query, { rank: 'tfidf' })
  console.log(`Ranked (TF-IDF): ${ranked.length} results\n`)
  for (let i = 0; i < Math.min(3, ranked.length); i++) {
    const span = ranked[i]
    const preview = span.text.length > 40 ? span.text.substring(0, 40) + '...' : span.text
    console.log(`  ${i + 1}. ${span.id} (order: ${span.meta.order})`)
    console.log(`     "${preview}"`)
  }
  console.log()

  // Example 2: Multi-word query with ranking
  console.log('─'.repeat(60))
  console.log('Example 2: Multi-word Query with Ranking')
  console.log('─'.repeat(60))

  const multiQuery = 'section paragraph'
  console.log(`Query: "${multiQuery}" (AND logic)\n`)

  const multiRanked = reader.search(multiQuery, { rank: 'tfidf' })
  console.log(`Found ${multiRanked.length} result(s):\n`)

  for (const span of multiRanked.slice(0, 3)) {
    const preview = span.text.length > 50 ? span.text.substring(0, 50) + '...' : span.text
    console.log(`  ${span.id}: "${preview}"`)
  }
  console.log()

  // Example 3: Limit with ranking
  console.log('─'.repeat(60))
  console.log('Example 3: Limit with Ranking')
  console.log('─'.repeat(60))

  const allResults = reader.search('the', { rank: 'tfidf' })
  const topResults = reader.search('the', { rank: 'tfidf', limit: 3 })

  console.log(`All results for "the": ${allResults.length}`)
  console.log(`Top 3 results: ${topResults.length}\n`)

  for (let i = 0; i < topResults.length; i++) {
    const span = topResults[i]
    const preview = span.text.length > 40 ? span.text.substring(0, 40) + '...' : span.text
    console.log(`  ${i + 1}. ${span.id}`)
    console.log(`     "${preview}"`)
  }
  console.log()

  // Example 4: TF Cache
  console.log('─'.repeat(60))
  console.log('Example 4: TF Cache')
  console.log('─'.repeat(60))

  console.log('Creating new reader with TF cache enabled...')
  const cachedReader = await createReader('dist/final-test')
  cachedReader.enableTfCache(100)
  console.log('✅ Cache enabled (size: 100)\n')

  // First search (builds cache)
  console.log('First search: "section"')
  const cached1 = cachedReader.search('section', { rank: 'tfidf' })
  console.log(`  Found ${cached1.length} results (cache populated)\n`)

  // Second search (uses cache)
  console.log('Second search: "section"')
  const cached2 = cachedReader.search('section', { rank: 'tfidf' })
  console.log(`  Found ${cached2.length} results (cache hit)\n`)

  // Different query (partial cache hit)
  console.log('Third search: "paragraph"')
  const cached3 = cachedReader.search('paragraph', { rank: 'tfidf' })
  console.log(`  Found ${cached3.length} results (new query)\n`)

  // Example 5: How TF-IDF works
  console.log('─'.repeat(60))
  console.log('Example 5: How TF-IDF Works')
  console.log('─'.repeat(60))

  console.log('TF-IDF = Term Frequency × Inverse Document Frequency\n')

  console.log('Components:')
  console.log('  • TF: 1 + log(count) - Higher for repeated terms')
  console.log('  • IDF: log(N / (1 + df)) - Higher for rare terms')
  console.log('  • Length norm: score / sqrt(doc_length) - Normalize by length\n')

  console.log('Example: Query "section"\n')

  const exampleQuery = 'section'
  const exampleRanked = reader.search(exampleQuery, { rank: 'tfidf' })

  if (exampleRanked.length >= 2) {
    const top = exampleRanked[0]
    const second = exampleRanked[1]

    console.log(`  Top result: ${top.id}`)
    console.log(`    Text: "${top.text.substring(0, 60)}..."`)
    console.log(`    Order: ${top.meta.order}`)
    console.log(`    (Highest TF-IDF score for "${exampleQuery}")\n`)

    console.log(`  Second result: ${second.id}`)
    console.log(`    Text: "${second.text.substring(0, 60)}..."`)
    console.log(`    Order: ${second.meta.order}`)
    console.log(`    (Lower TF-IDF score)\n`)
  }

  // Example 6: Common vs Rare terms
  console.log('─'.repeat(60))
  console.log('Example 6: Common vs Rare Terms')
  console.log('─'.repeat(60))

  console.log('Common word "the" (high DF → low IDF):')
  const commonResults = reader.search('the', { rank: 'tfidf', limit: 2 })
  console.log(`  Results: ${commonResults.length}`)
  if (commonResults.length > 0) {
    console.log(`  Top: ${commonResults[0].id}\n`)
  }

  console.log('Specific term "nested" (low DF → high IDF):')
  const rareResults = reader.search('nested', { rank: 'tfidf', limit: 2 })
  console.log(`  Results: ${rareResults.length}`)
  if (rareResults.length > 0) {
    console.log(`  Top: ${rareResults[0].id}\n`)
  }

  console.log('Rare terms get higher IDF weights, making them more important.')
  console.log()

  console.log('✨ Demo complete!')
  console.log()
  console.log('Key Takeaways:')
  console.log('  • TF-IDF ranks by relevance, not just document order')
  console.log('  • Repeated terms (high TF) boost score')
  console.log('  • Rare terms (low DF) boost score')
  console.log('  • Length normalization prevents bias toward long docs')
  console.log('  • Optional LRU cache speeds up repeated queries')
}

demo().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
