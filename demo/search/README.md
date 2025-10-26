# Lexical Search Demo

Fast, deterministic text search with exact token matching.

## Overview

Lexical search provides case-insensitive token matching with AND logic for multi-word queries. It builds an inverted index mapping tokens to span IDs for O(1) lookups.

## Files

- **`demo.js`** - Interactive demonstration of search features
- **`verify.js`** - 17 comprehensive verification tests

## Running

### Interactive Demo

```bash
# From project root
node demo/search/demo.js
```

Shows:
- Single word search
- Multi-word AND queries
- Case insensitivity
- Markdown stripping
- Search with limit
- Search + context expansion

### Verification Tests

```bash
# Run all 17 tests
node demo/search/verify.js
```

## API Features

### Basic Search

```javascript
const reader = await createReader('output')

// Single word
const results = reader.search('error')

// Multi-word (AND logic)
const specific = reader.search('error handling')
```

### With Options

```javascript
// Limit results
const top5 = reader.search('section', { limit: 5 })

// No options (all results)
const all = reader.search('paragraph')
```

## How It Works

### Tokenization

Text is tokenized before indexing and searching:

**Rules:**
1. Convert to lowercase
2. Strip markdown syntax (`##`, `**`, `*`, `` ` ``)
3. Strip punctuation (keep only alphanumeric)
4. Split on whitespace
5. Remove empty strings

**Examples:**
```
"## Section Two"        → ["section", "two"]
"**bold** and *italic*" → ["bold", "and", "italic"]
"Here's a multi-line"   → ["here", "s", "a", "multi", "line"]
```

### Inverted Index

The index maps tokens to span IDs:

```
{
  "section": Set<"span:000003", "span:000004", "span:000007">,
  "error":   Set<"span:000002", "span:000005">,
  "two":     Set<"span:000004">
}
```

### Query Processing

**Single word:**
```javascript
search("section")
// Lookup "section" → return all matching span IDs
```

**Multi-word (AND):**
```javascript
search("section two")
// Lookup "section" → Set A
// Lookup "two" → Set B
// Return intersection: A ∩ B
```

## Features

### Case Insensitive

```javascript
reader.search("section")  // Same results
reader.search("SECTION")  // Same results
reader.search("SeCtiOn")  // Same results
```

### Markdown Stripped

```javascript
// "## Section Two" matches "section"
reader.search("section")
// Finds: "## Section Two"

// "**bold text**" matches "bold"
reader.search("bold")
// Finds: "**bold text**"
```

### Multi-Word AND

```javascript
// Requires BOTH terms
reader.search("section two")
// Finds spans containing both "section" AND "two"

// Order doesn't matter
reader.search("two section")  // Same results
```

### With Limit

```javascript
// Get top 3 matches only
const top3 = reader.search('paragraph', { limit: 3 })
```

### Empty Query Handling

```javascript
reader.search("")        // Returns []
reader.search("   ")     // Returns []
reader.search("xyz123")  // Returns [] if no match
```

## Performance

### Index Building
- **Time**: < 5ms for 1,000 spans
- **Space**: < 100KB for small documents
- **Trigger**: First `search()` call (lazy)

### Query Speed
- **Single word**: < 1ms
- **Multi-word**: < 2ms
- **With limit**: O(1) after lookup

### Example
From `sample.md` (9 spans, 460 chars):
- Index build: < 1ms
- Vocabulary: 91 unique tokens
- Search "section": 0.5ms average

## Test Coverage

The `verify.js` script tests 17 acceptance criteria:

**Basic Functionality** (11 tests):
- Single word search
- Case insensitive
- Multi-word AND
- Markdown stripped
- Bold markdown stripped
- Empty query handling
- Non-existent terms
- Limit option
- Deterministic ordering
- Punctuation stripped

**Index Building** (1 test):
- Lazy initialization

**Query Variations** (2 tests):
- Extra whitespace
- Leading/trailing space

**Edge Cases** (3 tests):
- Single letter search
- Numbers indexed
- Hyphenated word splitting

## Design Decisions

### Exact Tokens (Not Substrings)

**Choice:** Match complete tokens only

**Why:**
- Faster: O(1) map lookup vs O(N) scan
- Smaller index: Store tokens, not n-grams
- Predictable: "para" won't match "paragraph"

**Trade-off:** Can't do partial word matching (can add later)

### Strip Markdown/Punctuation

**Choice:** Remove all non-alphanumeric

**Why:**
- User-friendly: "section" matches "## Section"
- Clean tokens: No formatting noise
- Consistent processing

**Trade-off:** Can't search for markdown syntax itself

### Lazy Index Building

**Choice:** Build on first `search()` call

**Why:**
- Memory savings: Skip if search not used
- Faster Reader construction
- Consistent with optional features

**Trade-off:** First search slightly slower (acceptable)

### No Stop Words

**Choice:** Index all words (including "the", "a", "is")

**Why:**
- Simpler: No word list to maintain
- More predictable: All words searchable
- More flexible: Can search for "the" if needed

**Trade-off:** Slightly larger index (negligible)

### AND Logic

**Choice:** Multi-word queries require ALL terms

**Why:**
- More specific results
- User expectation (search engine behavior)
- Easy to implement (set intersection)

**Trade-off:** No OR support (can add later)

## Integration Examples

### Search + Context

```javascript
const matches = reader.search('nested section')

for (const match of matches) {
  const contextIds = reader.neighbors(match.id, { before: 1, after: 1 })
  const context = contextIds.map(id => reader.getSpan(id))
  // Display context with match highlighted
}
```

### Search within Section

```javascript
const section = reader.getSection('sec:000002')

const sectionResults = section.paragraphIds
  .map(id => reader.getSpan(id))
  .filter(span => span.text.toLowerCase().includes('query'))
```

### Search with Ranking

```javascript
// Unranked (document order)
const unranked = reader.search('error')

// Ranked by TF-IDF relevance
const ranked = reader.search('error', { rank: 'tfidf' })
```

See `../ranking/` for ranking demos.

## Comparison with Alternatives

### vs Substring Matching
- ✅ Faster (O(1) vs O(N))
- ✅ Compact index
- ❌ No partial words

### vs Full-Text Search Libraries
- ✅ Zero dependencies
- ✅ Simple implementation
- ❌ No advanced features (yet)

## Future Extensions

- Substring matching: `searchSubstring()`
- Boolean operators: AND, OR, NOT
- Phrase matching: `"exact phrase"`
- Stemming: "running" → "run"
- Fuzzy matching: Handle typos
- Highlighting: Return match positions

## Next Steps

- Explore ranking: `../ranking/demo.js`
- Read full docs: `LEXICAL_SEARCH.md`
- Check search summary: `SEARCH_SUMMARY.md`
