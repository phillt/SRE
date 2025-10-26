# Manifest.json Implementation

## ✅ Complete

The manifest.json feature makes each build self-describing and reproducible without needing to access the original source file.

## Overview

Every time the CLI processes a text file, it now generates **two outputs**:
1. `spans.jsonl` - The paragraph spans (existing)
2. `manifest.json` - Build metadata (new)

## Files Created

### Core Contracts
- `src/core/contracts/manifest.ts` - Zod schema for Manifest type

### Core Logic
- `src/core/ids/generate-corpus-id.ts` - Content-addressable corpus ID generator

### Adapters
- `src/adapters/writers/manifest-writer.ts` - Writes manifest.json with validation

### Utilities
- `src/utils/extract-title.ts` - Title extraction (user-provided or filename fallback)
- `src/utils/read-version.ts` - Reads version from package.json (cached)

### Updated Files
- `src/cli/index.ts` - Added `--title` flag
- `src/pipeline/spanize.ts` - Generates and writes manifest after spans

## Manifest Schema

```typescript
{
  id: string              // Content-addressable corpus ID (e.g., "corpus:904f64c3578a")
  title: string           // User-provided or filename-based
  createdAt: string       // ISO timestamp
  sourcePath: string      // Absolute file path
  sourceHash: string      // SHA-256 of normalized text
  byteLength: number      // Original file size in bytes
  spanCount: number       // Number of spans generated
  version: string         // Compiler version from package.json
  normalization: {
    unicode: "NFC"
    eol: "LF"
    blankLineCollapse: true
  }
  schema: {
    span: "1.0.0"
    manifest: "1.0.0"
  }
}
```

## Design Decisions

### 1. Corpus ID: Content-Addressable
- **Decision**: Use first 12 characters of `sourceHash`
- **Format**: `corpus:904f64c3578a`
- **Benefit**: Same content = same ID, regardless of file location
- **Use case**: Content deduplication, corpus identity tracking

### 2. Title: User-Provided with Fallback
- **Decision**: Accept `--title` flag, default to filename without extension
- **Format**: String (no restrictions)
- **Examples**:
  - `sample.txt` → `"sample"`
  - `--title "My Document"` → `"My Document"`

### 3. Version: From package.json
- **Decision**: Read from `package.json` at runtime
- **Implementation**: Cached after first read for performance
- **Current value**: `"1.0.0"`

## Usage

### Basic Usage (Filename as Title)
```bash
node dist/cli/index.js input.txt
```
Output: `title: "input"`

### Custom Title
```bash
node dist/cli/index.js input.txt --title "My Document"
```
Output: `title: "My Document"`

### Verbose Mode
```bash
node dist/cli/index.js input.txt -v
```
Shows:
```
Processing file: input.txt
Reading and normalizing text...
Source path: /absolute/path/to/input.txt
Source hash: ...
Original size: 160 bytes
Normalized text length: 152 characters
Splitting into paragraphs...
Generated 4 span(s)
Writing to JSONL...
Generating manifest...
Manifest written → dist/manifest.json
Processed 4 span(s) → dist/spans.jsonl
Manifest written → dist/manifest.json
```

## Verification Results

All acceptance criteria met ✅

### Test 1: Both Files Created
- ✅ `spans.jsonl` exists
- ✅ `manifest.json` exists

### Test 2: spanCount Matches
- ✅ `manifest.spanCount` equals lines in `spans.jsonl`

### Test 3: Determinism
- ✅ Same input produces identical manifest (except `createdAt`)
- ✅ All fields deterministic: id, title, sourcePath, sourceHash, byteLength, spanCount, version, normalization, schema
- ✅ Only `createdAt` differs between runs (as expected)

### Test 4: Custom Title
- ✅ `--title` flag works correctly
- ✅ Filename fallback works when flag not provided

### Test 5: Content-Addressable ID
- ✅ ID format: `corpus:` + first 12 chars of sourceHash
- ✅ Same content = same ID

### Test 6: Version from package.json
- ✅ Reads version correctly
- ✅ Caching works (performance optimization)

## Example Output

### Input File: `sample.txt`
```
This is the first paragraph.
It has multiple lines.

This is the second paragraph.


This is the third paragraph after many blank lines.

Last paragraph.
```

### Output: `manifest.json`
```json
{
  "id": "corpus:904f64c3578a",
  "title": "sample",
  "createdAt": "2025-10-26T17:59:30.436Z",
  "sourcePath": "/home/philllt/Projects/apps/SRE/test-input/sample.txt",
  "sourceHash": "904f64c3578a08a3deb2e13aa678d8cc615859380c5e3606451086fb436ed88e",
  "byteLength": 160,
  "spanCount": 4,
  "version": "1.0.0",
  "normalization": {
    "unicode": "NFC",
    "eol": "LF",
    "blankLineCollapse": true
  },
  "schema": {
    "span": "1.0.0",
    "manifest": "1.0.0"
  }
}
```

### Output: `spans.jsonl`
```json
{"id":"span:000001","text":"This is the first paragraph.\nIt has multiple lines.","meta":{"order":0}}
{"id":"span:000002","text":"This is the second paragraph.","meta":{"order":1}}
{"id":"span:000003","text":"This is the third paragraph after many blank lines.","meta":{"order":2}}
{"id":"span:000004","text":"Last paragraph.","meta":{"order":3}}
```

## Benefits

### 1. Self-Describing Builds
- No need to access source file to understand the corpus
- All metadata in one place

### 2. Reproducibility
- Source hash enables verification
- Normalization settings documented
- Version tracking for migrations

### 3. Content Addressability
- Corpus ID based on content, not location
- Same content = same ID across systems
- Enables deduplication

### 4. Future-Proof
- Schema versions enable migrations
- Normalization settings documented
- Extensible structure

## Architecture Notes

The manifest feature follows the layered architecture:

```
CLI Layer (src/cli/index.ts)
    ↓ passes title option
Pipeline Layer (src/pipeline/spanize.ts)
    ↓ orchestrates
Core Layer (contracts, ids, segment)
    ↓ generates metadata
Adapters Layer (writers/manifest-writer.ts)
    ↓ writes to disk
Utils Layer (extract-title, read-version, hash)
```

All layers respect their boundaries:
- Core logic is pure (no I/O)
- Adapters handle all file operations
- Pipeline orchestrates the workflow
- CLI provides user interface

## Next Steps

The manifest enables future features:
- **Indexing**: Use manifest for search indexing
- **Versioning**: Track changes via sourceHash
- **Collections**: Group corpora by metadata
- **Migrations**: Schema versions enable upgrades
- **Caching**: Detect unchanged inputs via hash
