# TF-IDF Ranking Demo

Relevance ranking for search results using TF-IDF scoring.

## Overview

TF-IDF (Term Frequency × Inverse Document Frequency) ranks search results by relevance rather than document order. It scores spans based on term frequency, document frequency, and length normalization.

## Files

- **`demo.js`** - Interactive demonstration comparing ranked vs unranked search
- **`verify.js`** - 12 comprehensive verification tests

## Running

### Interactive Demo

```bash
# From project root
node demo/ranking/demo.js
```

Shows:
- Ranked vs unranked comparison
- Multi-word query ranking
- Limit with ranking
- TF caching
- How TF-IDF works
- Common vs rare terms

### Verification Tests

```bash
# Run all 12 tests
node demo/ranking/verify.js
```

## API Features

### Basic Ranking

```javascript
const reader = await createReader('output')

// Unranked (document order)
const unranked = reader.search('error')

// Ranked by TF-IDF
const ranked = reader.search('error', { rank: 'tfidf' })
```

### With Limit

```javascript
// Get top 5 most relevant
const top5 = reader.search('section', { rank: 'tfidf', limit: 5 })
```

### Enable TF Caching

```javascript
// Enable optional LRU cache (100 TF vectors)
reader.enableTfCache(100)

// Now ranking queries use cache
const results = reader.search('query', { rank: 'tfidf' })
```

## How It Works

### TF-IDF Formula

```
score = Σ (TF × IDF) / √(doc_length)
```

**Components:**

1. **TF (Term Frequency)**: `1 + log(count)`
   - How often term appears in this span
   - Log-normalized to dampen high frequencies

2. **IDF (Inverse Document Frequency)**: `log(N / (1 + df))`
   - How rare the term is across all spans
   - Rare terms get higher weight

3. **Length Normalization**: `score / √(doc_length)`
   - Prevents bias toward long documents

### Example

Query: **"error handling"**

**Span A (50 tokens):**
- "error" appears 2 times → TF = 1 + log(2) = 1.69
- "error" in 5 of 100 spans → IDF = log(100/6) = 2.81
- "handling" appears 1 time → TF = 1 + log(1) = 1.00
- "handling" in 2 of 100 spans → IDF = log(100/3) = 3.51
- Score = ((1.69 × 2.81) + (1.00 × 3.51)) / √50 = 1.17

**Span B (20 tokens):**
- "error" appears 1 time → TF = 1.00
- "handling" appears 1 time → TF = 1.00
- Score = ((1.00 × 2.81) + (1.00 × 3.51)) / √20 = 1.41

**Result:** Span B ranks higher (1.41 > 1.17) despite having fewer occurrences, because it's shorter and more focused.

## Features

### Hybrid Caching

**DF (Document Frequency):** Cached globally in inverted index
- No memory overhead
- Instant access via postings lists

**TF (Term Frequency):** Computed per query
- Optional LRU cache (default: off)
- Enable with `reader.enableTfCache(size)`

### Log-Normalized TF

Instead of raw counts, TF uses `1 + log(count)`:

```
count=1  → TF=1.00
count=2  → TF=1.69
count=4  → TF=2.39
count=10 → TF=3.32
```

This dampens the effect of repeated terms. Without log normalization, a span with "error error error" would score 3× higher than one with "error" once, even though both are about errors.

### Length Normalization

Score is divided by `√(doc_length)` to prevent bias:

- Short, focused spans rank higher
- Long, rambling spans rank lower
- Sqrt (not linear) balances the penalty

### Deterministic Results

- Same query always returns same order
- Ties broken by document order
- No randomness in scoring

## Performance

### Index Building
- **Time**: Same as lexical search (< 5ms)
- **Ranker**: Lazy-initialized on first ranked query

### Query Speed
- **Ranked search**: < 3ms for typical queries
- **TF cache hit**: Near-instant for cached spans
- **Memory**: ~1-2KB per cached TF vector

### Caching Strategy
- **Without cache**: Compute TF on every query
  - Good for: One-off queries, memory-constrained
- **With cache**: Store TF vectors in LRU
  - Good for: Repeated queries, overlapping result sets

## Test Coverage

The `verify.js` script tests 12 acceptance criteria:

**Basic Functionality** (5 tests):
- Ranked vs unranked differs
- Ranking can reorder
- Default is document order
- Limit works with ranking

**TF Cache** (1 test):
- Cache can be enabled

**Multiple Queries** (2 tests):
- Different queries produce different rankings
- Multi-word query with ranking

**Edge Cases** (3 tests):
- Empty query
- Non-existent term
- Single result

**Consistency** (1 test):
- Deterministic results

## Design Decisions

### Log-Normalized TF

**Choice:** `TF = 1 + log(count)`

**Why:**
- Dampens effect of repeated terms
- Prevents keyword stuffing
- Standard in IR literature

**Alternative:** Raw counts (too biased toward repetition)

### Divide by Sqrt(Length)

**Choice:** Normalize by `√(doc_length)`

**Why:**
- Balances penalty for length
- Less harsh than linear division
- Standard in IR systems

**Alternative:** No normalization (biased toward long docs)

### Hybrid Caching

**Choice:** Global DF, optional TF cache

**Why:**
- DF is free (from inverted index)
- TF varies per span (cache helps if repeated)
- User controls memory/speed trade-off

**Alternative:** Cache everything (wastes memory), cache nothing (slower)

### Lazy Ranker Building

**Choice:** Build ranker on first ranked query

**Why:**
- Skip cost if ranking not used
- Consistent with lazy search index
- Minimal impact (ranker is lightweight)

**Alternative:** Build eagerly (wastes time if unused)

## Integration Examples

### Ranked Search + Context

```javascript
const matches = reader.search('error', { rank: 'tfidf', limit: 3 })

for (const match of matches) {
  console.log(`Relevance rank: ${matches.indexOf(match) + 1}`)

  const contextIds = reader.neighbors(match.id, { before: 1, after: 1 })
  const context = contextIds.map(id => reader.getSpan(id))
  // Display context...
}
```

### Adaptive Caching

```javascript
// Enable cache for interactive sessions
if (isInteractive) {
  reader.enableTfCache(200)  // Larger cache for exploration
}

// No cache for batch processing
const results = reader.search(query, { rank: 'tfidf' })
```

## Comparison with Alternatives

### vs Document Order
- ✅ Relevance-based ranking
- ✅ More useful for large result sets
- ❌ Slightly slower (< 2ms difference)

### vs BM25
- ✅ Simpler implementation
- ✅ No hyperparameters
- ❌ Less sophisticated (BM25 has term saturation)

### vs Semantic Search
- ✅ Fast, deterministic
- ✅ No ML models needed
- ❌ No understanding of meaning/synonyms

## Future Extensions

- **BM25**: More sophisticated ranking with term saturation
- **Phrase boosting**: Higher scores for exact phrases
- **Field boosting**: Weight title/headings higher
- **Recency bias**: Boost recent documents
- **Custom scoring**: User-defined score functions
- **Explain API**: Show how score was calculated

## When to Use

**Use ranking when:**
- Result set is large (>10 spans)
- Query is broad (matches many spans)
- User wants "best" results first
- Building search UI/API

**Skip ranking when:**
- Result set is small (<5 spans)
- Document order is meaningful (e.g., chronological)
- Performance is critical (< 1ms difference though)

## Next Steps

- Read full ranking docs: `../search/LEXICAL_SEARCH.md#relevance-ranking`
- Explore reader API: `../reader/demo.js`
- Check production CLI: `../../bin/sre-search.js --rank=tfidf`
