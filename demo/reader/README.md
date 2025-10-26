# Reader API Demo

Runtime API for loading and querying span artifacts.

## Overview

The Reader provides read-only, efficient access to pre-built span artifacts. It loads JSON artifacts from disk and builds in-memory indexes for fast querying.

## Files

- **`demo.js`** - Interactive demonstration of all Reader features
- **`example-cli.js`** - Command-line tool for querying artifacts
- **`verify.js`** - 26 comprehensive verification tests

## Running

### Interactive Demo

```bash
# From project root
node demo/reader/demo.js
```

Shows:
- Document metadata
- Span access by ID and order
- Context expansion with neighbors()
- Section navigation
- Build quality metrics

### Example CLI Tool

```bash
# Show document info
node demo/reader/example-cli.js ../../dist/final-test info

# Get span by ID
node demo/reader/example-cli.js ../../dist/final-test span span:000001

# Get span by order
node demo/reader/example-cli.js ../../dist/final-test order 0

# Get context (before=1, after=1)
node demo/reader/example-cli.js ../../dist/final-test context span:000003 1 1

# List all sections
node demo/reader/example-cli.js ../../dist/final-test sections

# Get section details
node demo/reader/example-cli.js ../../dist/final-test section sec:000001
```

### Verification Tests

```bash
# Run all 26 tests
node demo/reader/verify.js
```

## API Features

### Loading Artifacts

```javascript
import { createReader } from './dist/runtime/api/index.js'

const reader = await createReader('path/to/output-dir')
```

Loads and validates:
- `manifest.json` - Document metadata
- `spans.json` - Array of paragraph spans
- `nodeMap.json` - Hierarchical structure (optional)
- `buildReport.json` - Quality metrics (optional)

### Querying Spans

```javascript
// Get span by ID
const span = reader.getSpan('span:000001')

// Get span by document order
const firstSpan = reader.getByOrder(0)

// Get total count
const count = reader.getSpanCount()
```

### Context Expansion

```javascript
// Get neighbors around a span
const contextIds = reader.neighbors('span:000003', {
  before: 2,  // 2 spans before
  after: 2    // 2 spans after
})

// Returns: ['span:000001', 'span:000002', 'span:000003', 'span:000004', 'span:000005']
```

### Section Navigation

```javascript
// List all sections
const sectionIds = reader.listSections()

// Get section paragraphs
const section = reader.getSection('sec:000001')
// Returns: { paragraphIds: ['span:000001', 'span:000002'] }

// Access full node map
const nodeMap = reader.getNodeMap()
```

### Metadata Access

```javascript
// Get manifest
const manifest = reader.getManifest()
console.log(manifest.title, manifest.format, manifest.spanCount)

// Get build report (quality metrics)
const report = reader.getBuildReport()
console.log(report.summary.avgCharsPerSpan)
console.log(report.warnings.shortSpans)
```

## Performance

### Index Building
- **Time**: < 10ms for 1,000 spans
- **Memory**: ~1KB per span
- **Eager**: All indexes built in constructor

### Query Operations
- **getSpan()**: O(1) hash lookup
- **getByOrder()**: O(1) hash lookup
- **neighbors()**: O(n) where n = before + after
- **listSections()**: O(k log k) where k = number of sections

## Test Coverage

The `verify.js` script tests 26 acceptance criteria:

**Basic Operations** (8 tests):
- Load Markdown and TXT artifacts
- Manifest access
- Span count accuracy
- getByOrder() correctness
- neighbors() correctness
- Section navigation
- Error handling

**Edge Cases** (6 tests):
- First/last span boundaries
- Context at document edges
- Missing IDs
- Invalid orders
- Empty sections

**Structure** (6 tests):
- NodeMap existence for Markdown
- Synthetic sections for TXT
- Heading paths
- Chapter/section hierarchy
- Paragraph association

**Quality** (6 tests):
- Build report access
- Quality metrics
- Warning flags
- Deterministic results
- Multiple readers

## Error Handling

The Reader handles errors gracefully:

```javascript
// Missing file
const reader = await createReader('nonexistent')
// Throws: Error with clear message

// Invalid span ID
const span = reader.getSpan('invalid')
// Returns: undefined

// Out of range order
const span = reader.getByOrder(999999)
// Returns: undefined
```

## Design Notes

### Why Eager Index Building?

Indexes are built in constructor because:
- Amortized cost is negligible (< 10ms)
- All queries benefit from pre-built indexes
- Simpler implementation (no lazy logic)
- Predictable performance

### Why Immutable?

Reader is read-only because:
- Spans are pre-built and frozen
- No runtime mutations needed
- Simpler reasoning about state
- Thread-safe (future consideration)

### Why No Streaming?

Artifacts are loaded fully into memory because:
- Artifacts are small (< 10MB typical)
- Random access requires full data
- Indexes need complete dataset
- Simplifies API

## Integration Examples

### With Search

```javascript
const reader = await createReader('output')

// Search returns span IDs
const results = reader.search('error handling')

// Expand results with context
for (const span of results) {
  const contextIds = reader.neighbors(span.id, { before: 1, after: 1 })
  const context = contextIds.map(id => reader.getSpan(id))
  // Display context...
}
```

### With Sections

```javascript
// Find all errors in a specific section
const section = reader.getSection('sec:000002')
const sectionSpans = section.paragraphIds
  .map(id => reader.getSpan(id))
  .filter(span => span.text.toLowerCase().includes('error'))
```

## Next Steps

- Explore search: `../search/demo.js`
- Explore ranking: `../ranking/demo.js`
- Read runtime docs: `RUNTIME_READER.md`
- Read search docs: `../search/LEXICAL_SEARCH.md`
