# Retrieval Packs

**Transform search hits into LLM-ready context blocks**

Retrieval packs extend SRE's search capabilities by automatically expanding search results into larger context windows suitable for LLM consumption. Instead of returning individual paragraph spans, `retrieve()` returns merged, deduplicated context blocks with budget controls.

## Quick Start

```javascript
import { createReader } from 'sre/runtime'

const reader = await createReader('output/')

// Basic retrieval: expand each hit to include ±1 neighbor
const packs = reader.retrieve('machine learning', {
  limit: 5,
  perHitNeighbors: 1,
  expand: 'neighbors'
})

// Each pack is a ready-to-use context block
for (const pack of packs) {
  console.log(`Context (${pack.meta.charCount} chars):`)
  console.log(pack.text)
}
```

## Core Concept

**Problem**: Search returns individual paragraphs, but LLMs need surrounding context to understand the full meaning.

**Solution**: Retrieval packs automatically expand each search hit to include:
- **Neighbors mode**: ±N surrounding paragraphs
- **Section mode**: The entire section containing the hit

Overlapping contexts are merged and deduplicated automatically.

## API

### `reader.retrieve(query, options)`

Returns an array of `RetrievalPack` objects.

**Parameters**:
- `query` (string): Search query (uses same lexical search as `search()`)
- `options` (object):
  - `limit` (number): Maximum packs to return (default: 5)
  - `perHitNeighbors` (number): Neighbors before/after each hit (default: 1)
  - `expand` ('neighbors' | 'section'): Expansion mode (default: 'neighbors')
  - `maxTokens` (number): Maximum total characters across all packs (optional)
  - `rank` ('none' | 'tfidf'): Ranking mode (default: 'tfidf')

**Returns**: `RetrievalPack[]`

## RetrievalPack Structure

```typescript
{
  packId: string              // Deterministic ID: "s:<sectionId>" or "o:<start>-<end>"
  entry: {
    spanId: string           // The search hit that triggered this pack
    order: number            // Document position of hit
    score: number            // TF-IDF relevance score
    headingPath: string[]    // Heading path of hit
  }
  scope: {
    type: 'neighbors' | 'section'
    sectionId?: string       // Present for section type
    range?: {                // Present for neighbors type
      start: number
      end: number
    }
  }
  paragraphIds: string[]     // All span IDs in this pack (document order)
  text: string               // Joined text (\n\n between paragraphs)
  meta: {
    headingPath: string[]    // Context heading path (section or entry)
    spanCount: number        // Number of paragraphs
    charCount: number        // Total characters
  }
}
```

## Expansion Modes

### Neighbors Mode

Includes ±`perHitNeighbors` paragraphs around each hit.

```javascript
// Include hit + 2 before + 2 after = up to 5 paragraphs
const packs = reader.retrieve('neural networks', {
  expand: 'neighbors',
  perHitNeighbors: 2
})
```

**Use cases**:
- Fine-grained context control
- Mixed content documents
- Specific mention extraction

**Pack IDs**: `o:<start>-<end>` (e.g., `o:10-14`)

### Section Mode

Includes the entire section containing each hit.

```javascript
// Get full sections
const packs = reader.retrieve('training', {
  expand: 'section'
})
```

**Use cases**:
- Markdown documents with clear structure
- Topic-based retrieval
- Comprehensive context

**Pack IDs**: `s:<sectionId>` (e.g., `s:sec:000003`)

**Fallback**: Plain text documents (no section structure) automatically fall back to neighbors mode.

## Deduplication

When multiple hits expand to overlapping contexts, they're automatically merged:

```javascript
// Two hits in same section → one pack for that section
const packs = reader.retrieve('algorithm performance', {
  expand: 'section'
})

// Two hits with overlapping neighbors → one merged pack
const packs2 = reader.retrieve('the', {
  expand: 'neighbors',
  perHitNeighbors: 5  // Large overlap window
})
```

**Merge rules**:
- Packs with identical `packId` are merged
- Keep the entry with highest score
- Union all paragraphIds (document order preserved)
- No duplicate paragraph IDs across packs

## Ranking and Ordering

Packs are ranked by:
1. **Primary**: Entry score (descending) - highest relevance first
2. **Tie-breaker**: Entry order (ascending) - earliest in document first

```javascript
// TF-IDF ranking (default)
const packs = reader.retrieve('query', { rank: 'tfidf' })
// → Packs sorted by relevance

// No ranking
const packs2 = reader.retrieve('query', { rank: 'none' })
// → All scores = 0, sorted by document order
```

## Budget Constraints

Control output size with `limit` and `maxTokens`:

```javascript
// Limit number of packs
const packs = reader.retrieve('query', {
  limit: 3  // Return max 3 packs
})

// Limit total characters (hard limit)
const packs2 = reader.retrieve('query', {
  limit: 10,
  maxTokens: 2000  // Stop before exceeding 2000 chars
})
```

**Budget enforcement**:
- `limit`: Maximum number of packs
- `maxTokens`: Maximum total characters (stops before adding pack that would exceed)
- Hard limit strategy: strict constraint enforcement

## Comparison: search() vs retrieve()

| Feature | `search()` | `retrieve()` |
|---------|------------|--------------|
| Returns | Individual spans | Context packs |
| Context | Single paragraph | Neighbors or section |
| Deduplication | No | Yes |
| Budget | Span count only | Span count + characters |
| Use case | Finding mentions | Providing LLM context |

```javascript
// Find specific mentions
const spans = reader.search('machine learning', { limit: 5 })
// → ['span:000042', 'span:000103', ...]

// Get context for LLM
const packs = reader.retrieve('machine learning', { limit: 5 })
// → [{ text: "...full context...", entry: {...}, ...}, ...]
```

## Use Cases

### 1. RAG (Retrieval-Augmented Generation)

```javascript
const packs = reader.retrieve(userQuery, {
  limit: 3,
  expand: 'section',
  maxTokens: 4000,
  rank: 'tfidf'
})

const prompt = `Answer based on these contexts:\n\n${
  packs.map((p, i) => `Context ${i + 1}:\n${p.text}`).join('\n\n---\n\n')
}\n\nQuestion: ${userQuery}`
```

### 2. Semantic Search Preview

```javascript
const packs = reader.retrieve(searchTerm, {
  limit: 10,
  perHitNeighbors: 0,  // Just the hit
  rank: 'tfidf'
})

// Display results with scores
for (const pack of packs) {
  console.log(`${pack.entry.score.toFixed(2)} - ${pack.text.substring(0, 100)}...`)
}
```

### 3. Context-Aware Navigation

```javascript
// User clicks a search result, show context
const packs = reader.retrieve(term, {
  limit: 1,
  perHitNeighbors: 2,
  expand: 'neighbors'
})

// Highlight the entry span within the context
const entrySpanId = packs[0].entry.spanId
const contextSpanIds = packs[0].paragraphIds
```

## Determinism Guarantees

Retrieval packs are **100% deterministic**:

✅ Same input → identical output
✅ Same options → same packs
✅ Same corpus build → same pack IDs
✅ Reproducible across runs

This enables:
- Reliable testing
- Caching
- Reproducible research
- Bitwise-identical rebuilds

## Performance

- **Lazy expansion**: Only expands top candidates (limit × 4)
- **Efficient merging**: O(n log n) sort + O(n) merge
- **No redundant work**: Deduplication happens once
- **Budget early stop**: Stops immediately when budget exhausted

For large corpora with TF-IDF, consider enabling TF caching:

```javascript
reader.enableTfCache(100)  // Cache 100 most recent TF vectors
const packs = reader.retrieve(query, { rank: 'tfidf' })
```

## Running the Demo

```bash
npm run build
node demo/retrieval/demo.js
```

## Running Tests

```bash
npm run build
node demo/retrieval/verify.js
```

Expected: ~40 tests covering determinism, integrity, deduplication, ordering, and budgeting.

## Examples

See `demo.js` for 8 complete examples:
1. Basic neighbors expansion
2. Section expansion
3. TF-IDF ranking
4. Budget constraints
5. Deduplication
6. Search vs retrieve comparison
7. Plain text fallback
8. Practical LLM use case

## Design Principles

1. **Pure core, mutable edges**: All transformations deterministic
2. **Zero new dependencies**: Built on existing SRE primitives
3. **Explicit budget control**: Hard limits prevent unbounded output
4. **Graceful fallback**: Plain text → neighbors mode
5. **Transparent scoring**: Scores exposed for debugging

## Future Enhancements

Potential additions (not in v0):
- Hybrid retrieval (semantic + lexical)
- Custom deduplication strategies
- Pack-level caching
- Streaming API for large results
- Multi-query fusion