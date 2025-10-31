# Ranking Demo (TF-IDF + Hybrid)

Relevance ranking for search results using TF-IDF and hybrid (lexical + semantic) scoring.

## Overview

SRE provides two ranking modes:

1. **TF-IDF**: Lexical ranking based on Term Frequency × Inverse Document Frequency
2. **Hybrid**: Combines TF-IDF (lexical precision) with semantic similarity (embedding cosine)

Both modes rank search results by relevance rather than document order, with configurable options for different use cases.

## Files

- **`demo.js`** - Interactive demonstration comparing ranking modes
- **`verify.js`** - 22 comprehensive verification tests (12 TF-IDF + 10 hybrid)

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
- **Hybrid ranking** (lexical + semantic)
- **Custom hybrid weights**
- **Hybrid + fuzzy matching**

### Verification Tests

```bash
# Run all 22 tests
node demo/ranking/verify.js
```

Tests cover:
- TF-IDF ranking (12 tests)
- Hybrid ranking (10 tests)

## API Features

### Basic Ranking

```javascript
const reader = await createReader('output')

// Unranked (document order)
const unranked = reader.search('error')

// Ranked by TF-IDF
const tfidf = reader.search('error', { rank: 'tfidf' })

// Hybrid ranking (lexical + semantic)
const hybrid = reader.search('error', { rank: 'hybrid' })
```

### Hybrid with Custom Weights

```javascript
// Default: 70% lexical, 30% semantic
const defaultHybrid = reader.search('verify phone', { rank: 'hybrid' })

// Balanced: 50% lexical, 50% semantic
const balanced = reader.search('verify phone', {
  rank: 'hybrid',
  hybrid: { weightLexical: 0.5, weightSemantic: 0.5 }
})

// Semantic-heavy: 30% lexical, 70% semantic (good for paraphrased queries)
const semantic = reader.search('authentication method', {
  rank: 'hybrid',
  hybrid: { weightLexical: 0.3, weightSemantic: 0.7 }
})
```

### With Limit

```javascript
// Get top 5 most relevant
const top5 = reader.search('section', { rank: 'tfidf', limit: 5 })

// Top 5 with hybrid ranking
const hybridTop5 = reader.search('section', { rank: 'hybrid', limit: 5 })
```

### Hybrid + Fuzzy

```javascript
// Combine hybrid ranking with fuzzy matching for typos
const fuzzyHybrid = reader.search('secton', {
  rank: 'hybrid',
  fuzzy: { enabled: true }
})
```

### Enable TF Caching

```javascript
// Enable optional LRU cache (100 TF vectors)
reader.enableTfCache(100)

// Now ranking queries use cache (works for both tfidf and hybrid)
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

### Hybrid Ranking Formula

Hybrid ranking fuses lexical (TF-IDF) and semantic (embedding cosine) signals:

```
hybrid_score = (tfidf_norm × w_lex) + (cosine_norm × w_sem)
```

**Components:**

1. **Lexical Score (TF-IDF)**: Computed as above
   - Measures term overlap and frequency
   - Good for exact keyword matching

2. **Semantic Score (Cosine)**: `cos(query_embedding, span_embedding)`
   - Uses 128-d deterministic embeddings (hash-based projection)
   - Measures semantic similarity
   - Good for paraphrased or reworded queries

3. **Normalization**: Both scores normalized to [0, 1] via min-max
   - Ensures stable fusion across different score ranges
   - Can be disabled with `normalize: false`

4. **Weighted Fusion**: Default 70% lexical, 30% semantic
   - Preserves precision while adding semantic recall
   - Fully configurable via `weightLexical` and `weightSemantic`

### Example: Hybrid vs TF-IDF

Query: **"verify phone number"**

**Span A: "Phone verification via SMS"**
- TF-IDF: Moderate (only "phone" matches)
- Semantic: High (same concept, different words)
- **Hybrid: High** (semantic boosts relevance)

**Span B: "Verify phone phone phone"**
- TF-IDF: High (repeated term)
- Semantic: Moderate (keyword stuffing)
- **Hybrid: Moderate** (lexical precision prevents over-ranking)

Hybrid ranking finds Span A more relevant, even though Span B has more keyword matches.

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

### TF-IDF vs Document Order
- ✅ Relevance-based ranking
- ✅ More useful for large result sets
- ❌ Slightly slower (< 2ms difference)

### TF-IDF vs BM25
- ✅ Simpler implementation
- ✅ No hyperparameters
- ❌ Less sophisticated (BM25 has term saturation)

### Hybrid vs Pure Semantic Search
- ✅ Combines precision (lexical) + recall (semantic)
- ✅ Configurable weights for different use cases
- ✅ Fast, deterministic (no external API)
- ✅ No ML training required
- ❌ Simpler embeddings than full transformer models

### Hybrid vs TF-IDF Only
- ✅ Finds semantically similar results (paraphrases, synonyms)
- ✅ Better for conversational queries
- ✅ Maintains lexical precision with default weights
- ❌ Slightly slower (~2ms additional cost)

## Future Extensions

- **BM25**: More sophisticated ranking with term saturation
- **External embeddings**: Support for transformer-based models (BERT, etc.)
- **Field boosting**: Weight title/headings higher
- **Recency bias**: Boost recent documents
- **Custom scoring**: User-defined score functions
- **Explain API**: Show how score was calculated
- **Query expansion**: Automatic synonym/related term expansion

## When to Use

**Use TF-IDF when:**
- Need precise keyword matching
- Query has specific technical terms
- Fast performance is priority
- Result set is large (>10 spans)

**Use Hybrid when:**
- Users rephrase queries (conversational search)
- Need both precision and semantic understanding
- Queries use synonyms or related concepts
- Building RAG/LLM-powered search
- Want to handle paraphrased content

**Skip ranking when:**
- Result set is small (<5 spans)
- Document order is meaningful (e.g., chronological)
- Only exact matches matter (use lexical search without ranking)

## Next Steps

- Read full ranking docs: `../search/LEXICAL_SEARCH.md#relevance-ranking`
- Explore reader API: `../reader/demo.js`
- Check production CLI: `../../bin/sre-search.js --rank=tfidf`
