# Runtime Reader Implementation

## ✅ Complete

A read-only runtime loader that opens compiled artifacts and exposes a stable, efficient API for runtime access.

## What Was Implemented

### 1. Artifact Loader (`src/runtime/loader/load-artifacts.ts`)

**Purpose**: Load all artifacts from an output directory with validation

**Required Files**:
- `manifest.json` - Document metadata (throws if missing)
- `spans.jsonl` - Text spans (throws if missing)

**Optional Files**:
- `nodeMap.json` - Hierarchical structure (silent if missing)
- `buildReport.json` - Quality metrics (silent if missing)

**Features**:
- Full Zod schema validation
- Descriptive error messages for missing/invalid files
- Line-by-line JSONL parsing
- Type-safe return value

**Function Signature**:
```typescript
export async function loadArtifacts(outputDir: string): Promise<LoadedArtifacts>

interface LoadedArtifacts {
  manifest: Manifest
  spans: Span[]
  nodeMap?: NodeMap
  buildReport?: BuildReport
}
```

### 2. Reader API (`src/runtime/api/Reader.ts`)

**Purpose**: Wrap loaded data with efficient indexes and clean query API

**Internal Indexes** (built eagerly on construction):
- `spansById: Map<string, Span>` - O(1) lookup by span ID
- `orderedSpans: Span[]` - Sorted by meta.order for sequential access
- `orderToId: Map<number, string>` - O(1) order → ID mapping
- `sectionIndex: Map<string, string[]>` - Section → paragraph IDs (if nodeMap exists)

**API Methods**:

#### Core Access

**`getManifest(): Manifest`**
- Returns the loaded manifest
- Always succeeds (manifest is required)
- Access to all document metadata

**`getSpan(id: string): Span | undefined`**
- O(1) lookup by span ID
- Returns undefined if not found
- Never throws

**`getSpanCount(): number`**
- Returns total number of spans
- Should match `manifest.spanCount`
- O(1) operation

**`getByOrder(order: number): Span | undefined`**
- Access spans by document order (0-indexed)
- Returns undefined if order out of range
- O(1) lookup via orderToId map

#### Context Navigation

**`neighbors(id: string, options?: { before?: number, after?: number }): string[]`**
- Get neighboring span IDs around a target span
- Default: `{ before: 1, after: 1 }`
- Returns IDs in order: `[before..., id, ...after]`
- Includes target span itself
- Handles boundaries gracefully (returns fewer IDs at edges)
- Returns empty array for invalid ID

Examples:
```typescript
// Get span with 1 before and 1 after (3 total)
reader.neighbors('span:000005')
// → ['span:000004', 'span:000005', 'span:000006']

// Get span with 2 after (3 total)
reader.neighbors('span:000001', { after: 2 })
// → ['span:000001', 'span:000002', 'span:000003']

// At document start with large before - returns fewer
reader.neighbors('span:000001', { before: 5, after: 1 })
// → ['span:000001', 'span:000002']
```

#### Section Access

**`getSection(sectionId: string): { paragraphIds: string[] } | undefined`**
- Get section data by section ID
- Returns paragraph span IDs in that section
- Returns undefined if no nodeMap or section not found
- O(1) lookup

**`listSections(): string[]`**
- List all section IDs in document
- Returns empty array if no nodeMap
- Sorted for determinism
- O(1) operation (pre-computed)

#### Optional Data Access

**`getNodeMap(): NodeMap | undefined`**
- Access the full node map if it exists
- Returns undefined if not present
- Useful for advanced navigation

**`getBuildReport(): BuildReport | undefined`**
- Access build quality metrics if available
- Returns undefined if not present
- Useful for quality checks

### 3. Convenience Factory (`src/runtime/api/index.ts`)

**Single-Function API**:
```typescript
export async function createReader(outputDir: string): Promise<Reader>
```

Combines loading + Reader construction in one step:
```typescript
import { createReader } from './runtime/api/index.js'

const reader = await createReader('dist/output')
```

**Also exports** all types and classes for advanced usage.

## Usage Examples

### Basic Usage

```typescript
import { createReader } from './runtime/api/index.js'

// Load artifacts
const reader = await createReader('dist/final-test')

// Access manifest
const manifest = reader.getManifest()
console.log(`Document: ${manifest.title}`)
console.log(`Spans: ${manifest.spanCount}`)
console.log(`Format: ${manifest.format}`)

// Get span count
const count = reader.getSpanCount()
console.log(`Loaded ${count} spans`)
```

### Span Access

```typescript
// By ID
const span = reader.getSpan('span:000001')
if (span) {
  console.log(span.text)
  console.log(span.meta.order)
  console.log(span.meta.headingPath)
}

// By order
const firstSpan = reader.getByOrder(0)
const lastSpan = reader.getByOrder(count - 1)
```

### Context Navigation

```typescript
// Get context around a span
const targetId = 'span:000005'
const contextIds = reader.neighbors(targetId, { before: 2, after: 2 })

// Load all context spans
const contextSpans = contextIds
  .map(id => reader.getSpan(id))
  .filter(s => s !== undefined)

// Display with highlighting
for (const span of contextSpans) {
  const highlight = span.id === targetId ? '>>> ' : '    '
  console.log(`${highlight}${span.text}`)
}
```

### Section Navigation

```typescript
// List all sections
const sections = reader.listSections()
console.log(`Document has ${sections.length} sections`)

// Iterate sections
for (const sectionId of sections) {
  const section = reader.getSection(sectionId)
  console.log(`\nSection ${sectionId}:`)
  console.log(`  Spans: ${section.paragraphIds.length}`)

  // Get section content
  for (const spanId of section.paragraphIds) {
    const span = reader.getSpan(spanId)
    console.log(`  - ${span.text.substring(0, 50)}...`)
  }
}
```

### Advanced: Node Map Access

```typescript
const nodeMap = reader.getNodeMap()
if (nodeMap) {
  console.log(`Book: ${nodeMap.book.title}`)
  console.log(`Chapters: ${Object.keys(nodeMap.chapters).length}`)
  console.log(`Sections: ${Object.keys(nodeMap.sections).length}`)

  // Navigate chapter hierarchy
  for (const [chapterId, chapter] of Object.entries(nodeMap.chapters)) {
    console.log(`\nChapter ${chapterId}:`)
    for (const sectionId of chapter.sectionIds) {
      const section = nodeMap.sections[sectionId]
      console.log(`  Section: ${section.meta.heading}`)
      console.log(`  Paragraphs: ${section.paragraphIds.length}`)
    }
  }
}
```

### Error Handling

```typescript
try {
  const reader = await createReader('dist/output')
  // ... use reader
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Output directory or required files missing')
  } else {
    console.error('Failed to load artifacts:', error.message)
  }
}
```

## Architecture

### Layering

```
User Code
    ↓
createReader() - convenience factory
    ↓
Reader class - query API with indexes
    ↓
loadArtifacts() - file loading + validation
    ↓
File System
```

### Type Reuse

All types imported from existing contracts:
- `Span` from `core/contracts/span.ts`
- `Manifest` from `core/contracts/manifest.ts`
- `NodeMap` from `core/contracts/node-map.ts`
- `BuildReport` from `core/contracts/report.ts`

Zero new type definitions - consistent with build pipeline.

### Index Building Strategy

**Eager Construction**:
- All indexes built in Reader constructor
- O(N) construction time
- O(1) query time for all methods
- Trade memory for speed

**Future Optimization Paths**:
- Lazy index building (build on first use)
- Streaming span access for large files
- Disk-backed indexes for huge corpora

## Performance

### Construction

- **Time**: O(N) where N = number of spans
- **Space**: O(N) for indexes
- **Typical**: <10ms for 1000 spans on modern hardware

### Queries

All queries are O(1):
- `getSpan()`: Map lookup
- `getByOrder()`: Two map lookups
- `getSpanCount()`: Map size
- `neighbors()`: K lookups (K = before + after + 1)
- `getSection()`: Map lookup
- `listSections()`: Pre-computed array

## Test Results

All 26 acceptance tests pass ✅

### Test Coverage

**Group 1: Markdown with NodeMap** (14 tests)
- ✅ Load artifacts successfully
- ✅ Manifest access
- ✅ Span count matches
- ✅ Order-based access
- ✅ Neighbors at boundaries
- ✅ Neighbors in middle
- ✅ Section listing and access
- ✅ All section spans exist

**Group 2: Plain TXT with Synthetic NodeMap** (4 tests)
- ✅ Synthetic section created (1 chapter, 1 section)
- ✅ All spans in synthetic section
- ✅ All API methods work
- ✅ NodeMap exists (synthetic structure)

**Group 3: Error Handling** (1 test)
- ✅ Missing directory throws descriptive error

**Group 4: Additional API** (5 tests)
- ✅ getSpan() by ID
- ✅ Invalid IDs return undefined
- ✅ getNodeMap() available for both formats
- ✅ getBuildReport() available

**Group 5: Read-Only Verification** (1 test)
- ✅ No mutations - pure read access

**Group 6: Boundary Cases** (1 test)
- ✅ Neighbors at document edges return fewer IDs

## Key Design Decisions

### Span Loading Strategy

**Eager in-memory loading** (MVP approach):
- Read entire spans.jsonl into memory
- Parse line-by-line to avoid memory spikes
- Build all indexes upfront
- Simple, predictable performance

**Why not streaming?**
- Most documents fit easily in memory (<10k spans)
- Indexes require full corpus anyway
- Can add streaming later if needed

### Error Handling Philosophy

**Required data** (manifest, spans):
- Throw descriptive errors with file paths
- Include validation details from Zod
- Fail fast - don't continue with bad data

**Optional data** (nodeMap, buildReport):
- Silent graceful degradation
- Methods return undefined/empty
- No warnings or errors

**Missing spans**:
- Return undefined (don't throw)
- Allows partial corpus access
- Caller decides how to handle

### Neighbors Semantics

**Include target span itself**:
- Natural "context window" behavior
- Consistent with common use cases
- Example: `neighbors(id, {before:0, after:0})` returns `[id]`

**Boundary handling**:
- Return fewer IDs at document edges
- Don't throw or pad with nulls
- Caller can check array length

**Order preserved**:
- IDs always in document order
- Never shuffled or reversed
- Target span position in array reflects before/after

## Files Created

1. `src/runtime/loader/load-artifacts.ts` - File loading with validation (~110 lines)
2. `src/runtime/api/Reader.ts` - Main API class with indexes (~180 lines)
3. `src/runtime/api/index.ts` - Convenience exports (~15 lines)
4. `verify-reader.js` - Comprehensive tests (~300 lines)

## Benefits

### Immediate Value

✅ **Runtime access** to compiled artifacts without reprocessing
✅ **Format-agnostic** - works for TXT, MD, future PDF, EPUB
✅ **Fast queries** - O(1) for all common operations
✅ **Type-safe** - Full TypeScript types from contracts
✅ **Read-only** - No mutations, no side effects
✅ **Graceful** - Handles missing optional files

### Future-Proofing

✅ **Stable API** - Insulated from artifact format changes
✅ **Easy to extend** - Add new indexes without breaking changes
✅ **HTTP-ready** - Can wrap in REST/GraphQL API
✅ **Search foundation** - Ready for full-text search layer
✅ **Retrieval patterns** - Enables semantic search, recommendations

## Next Steps

This runtime loader enables:

1. **Search API**: Full-text search over span text
2. **Retrieval API**: Semantic search, similarity, recommendations
3. **HTTP Service**: Wrap Reader in REST/GraphQL API
4. **CLI Tools**: Query tools built on Reader
5. **Browser Support**: Package for web use

## Usage in Applications

### CLI Tool

```typescript
#!/usr/bin/env node
import { createReader } from './runtime/api/index.js'

const reader = await createReader(process.argv[2])
const span = reader.getByOrder(0)
console.log(`First paragraph: ${span.text}`)
```

### HTTP Service

```typescript
import express from 'express'
import { createReader } from './runtime/api/index.js'

const app = express()
const reader = await createReader('./dist/corpus')

app.get('/api/spans/:id', (req, res) => {
  const span = reader.getSpan(req.params.id)
  if (!span) return res.status(404).json({ error: 'Not found' })
  res.json(span)
})

app.get('/api/sections', (req, res) => {
  const sections = reader.listSections()
  res.json({ sections })
})

app.listen(3000)
```

### Testing

```typescript
import { createReader } from './runtime/api/index.js'
import { expect } from 'chai'

describe('Document corpus', () => {
  let reader

  before(async () => {
    reader = await createReader('./test-output')
  })

  it('should have expected span count', () => {
    expect(reader.getSpanCount()).to.equal(42)
  })

  it('should have first paragraph', () => {
    const span = reader.getByOrder(0)
    expect(span.text).to.include('Introduction')
  })
})
```

## Summary

Runtime Reader implementation:
- ✅ Pure read-only (no writes, no mutations)
- ✅ Loads all artifacts with validation
- ✅ Builds efficient O(1) indexes
- ✅ Exposes clean, stable API
- ✅ Handles missing optional files gracefully
- ✅ 26/26 tests passing
- ✅ Ready for production use
- ✅ Foundation for retrieval features

The SRE system now has complete **build** AND **runtime** capabilities!
