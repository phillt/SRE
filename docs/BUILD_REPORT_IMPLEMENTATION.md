# Build Report Implementation

## ✅ Complete

The build report provides deterministic quality control metrics for every build, making each output self-documenting without requiring access to the source file.

## Overview

Every CLI run now generates **three outputs**:
1. `spans.jsonl` - Paragraph spans
2. `manifest.json` - Build metadata
3. `buildReport.json` - Quality metrics (new)

## Files Created

### Core Contracts
- `src/core/contracts/report.ts` - Zod schemas for BuildReport and all nested types

### Core Logic
- `src/core/validate/generate-report.ts` - Pure function for report generation

### Adapters
- `src/adapters/writers/report-writer.ts` - Writes buildReport.json with validation

### Updated Files
- `src/pipeline/spanize.ts` - Generates and writes report after manifest

## Report Structure

```json
{
  "summary": {
    "spanCount": 4,
    "totalChars": 146,
    "avgCharsPerSpan": 36.5,
    "multiLineSpans": 1
  },
  "lengthStats": {
    "min": { "chars": 15, "id": "span:000004", "order": 3 },
    "max": { "chars": 51, "id": "span:000001", "order": 0 },
    "p10": 15,
    "p50": 29,
    "p90": 51
  },
  "thresholds": {
    "shortSpanChars": 20,
    "longSpanChars": 2000
  },
  "warnings": {
    "shortSpans": 1,
    "longSpans": 0,
    "duplicateTexts": 0
  },
  "samples": {
    "shortest": "Last paragraph.",
    "longest": "This is the first paragraph.\nIt has multiple lines."
  },
  "provenance": {
    "id": "corpus:904f64c3578a",
    "sourceHash": "904f64c3578a08a3deb2e13aa678d8cc615859380c5e3606451086fb436ed88e",
    "createdAt": "2025-10-26T18:08:12.119Z",
    "version": "1.0.0"
  }
}
```

## Metrics Explained

### Summary Section
- **spanCount**: Total number of spans generated
- **totalChars**: Sum of all span text lengths
- **avgCharsPerSpan**: Average span length (rounded to 2 decimals)
- **multiLineSpans**: Count of spans containing internal newlines (`\n`)

### Length Statistics
- **min/max**: Shortest and longest spans with their IDs and order positions
- **p10**: 10th percentile of span lengths
- **p50**: Median span length (50th percentile)
- **p90**: 90th percentile of span lengths

Uses "nearest rank" percentile calculation method.

### Thresholds
- **shortSpanChars**: 20 (spans below this are flagged)
- **longSpanChars**: 2000 (spans above this are flagged)

These can be adjusted in `generate-report.ts`.

### Warnings
- **shortSpans**: Count of spans < 20 characters
- **longSpans**: Count of spans > 2000 characters
- **duplicateTexts**: Count of unique texts that appear more than once

### Samples
- **shortest**: Text of the shortest span (truncated to 200 chars if needed)
- **longest**: Text of the longest span (truncated to 200 chars if needed)

Truncation adds `...` to indicate text was cut off.

### Provenance
Links back to the manifest for traceability:
- **id**: Corpus ID (content-addressable)
- **sourceHash**: SHA-256 of normalized text
- **createdAt**: ISO timestamp
- **version**: Compiler version

## Design Decisions

### 1. Pure Function for Generation
- `generateReport()` has no side effects
- Takes spans array and manifest as inputs
- Returns complete BuildReport object
- Fully testable in isolation

### 2. Sample Text Truncation
- Keeps report readable for very long paragraphs
- Truncates at 200 characters with `...` suffix
- Full text still available in `spans.jsonl`

### 3. Multi-line Span Tracking
- Counts spans with internal newlines
- Helps understand paragraph structure
- Not treated as a warning (expected for some content)

### 4. Percentile Method
- Uses "nearest rank" method
- p10 = value at index `ceil(0.10 * n) - 1`
- p50 = median
- p90 = value at index `ceil(0.90 * n) - 1`

### 5. Duplicate Detection
- Exact text matching only
- Uses Map for efficient counting
- Reports number of duplicate texts (not total duplicates)

## Usage

```bash
# Normal usage (report generated automatically)
node dist/cli/index.js input.txt

# Verbose mode shows report path
node dist/cli/index.js input.txt -v
```

Output:
```
Processing file: input.txt
Reading and normalizing text...
Source path: /absolute/path/to/input.txt
Source hash: 904f64c3578a...
Original size: 160 bytes
Normalized text length: 152 characters
Splitting into paragraphs...
Generated 4 span(s)
Writing to JSONL...
Generating manifest...
Manifest written → dist/manifest.json
Generating build report...
Report written → dist/buildReport.json
Processed 4 span(s) → dist/spans.jsonl
Manifest written → dist/manifest.json
```

## Verification Results

All acceptance criteria met ✅

### Test 1: Three Files Created
- ✅ `spans.jsonl` exists
- ✅ `manifest.json` exists
- ✅ `buildReport.json` exists

### Test 2: Span Count Matches
- ✅ `summary.spanCount` equals lines in `spans.jsonl`

### Test 3: Percentiles Monotonic
- ✅ p10 ≤ p50 ≤ p90 (always)

### Test 4: Determinism
- ✅ Same input produces identical report
- ✅ All fields deterministic (except `createdAt` from manifest)

### Test 5: Min/Max Correct
- ✅ Correct span IDs included
- ✅ Correct order positions included
- ✅ ID format validated (`span:NNNNNN`)

### Test 6: Multi-line Count Accurate
- ✅ Correctly counts spans with internal `\n`

### Test 7: Warnings Accurate
- ✅ Short spans counted correctly (< 20 chars)
- ✅ Long spans counted correctly (> 2000 chars)

### Test 8: Duplicate Detection Works
- ✅ Exact text matches detected
- ✅ Count accurate

### Test 9: Sample Texts Present
- ✅ Shortest sample included
- ✅ Longest sample included
- ✅ Truncation works (> 200 chars → "..." suffix)

### Test 10: Provenance Links
- ✅ ID matches manifest
- ✅ sourceHash matches manifest
- ✅ createdAt matches manifest
- ✅ version matches manifest

## Example: Quality Issue Detection

### Short Span Warning
```json
{
  "warnings": {
    "shortSpans": 3,
    ...
  }
}
```
Indicates 3 spans are very short (< 20 chars), which might be formatting artifacts or headers.

### Long Span Warning
```json
{
  "warnings": {
    "longSpans": 2,
    ...
  }
}
```
Indicates 2 spans are very long (> 2000 chars), which might need better paragraph segmentation.

### Duplicate Detection
```json
{
  "warnings": {
    "duplicateTexts": 5,
    ...
  }
}
```
Indicates 5 unique texts appear multiple times, which might be repeated sections or boilerplate.

## Benefits

### 1. Quick QC
- Instant quality metrics without opening files
- Spot issues at a glance
- No need to process spans.jsonl manually

### 2. Self-Contained
- Each build has its own quality report
- No external tools needed
- Human-readable JSON

### 3. Deterministic
- Same input = same report (except timestamps)
- Reproducible metrics
- Suitable for CI/CD validation

### 4. Extensible
- Easy to add new metrics
- Schema versioned for migrations
- Pure function makes testing easy

### 5. Production-Ready
- Validates data quality at build time
- Links back to source via provenance
- Catches potential issues early

## Architecture

The report follows the layered architecture:

```
Pipeline Layer (src/pipeline/spanize.ts)
    ↓ orchestrates
Core Layer (src/core/validate/generate-report.ts)
    ↓ pure calculation
Contracts Layer (src/core/contracts/report.ts)
    ↓ validates with
Adapters Layer (src/adapters/writers/report-writer.ts)
    ↓ writes to disk
```

All calculations happen in the pure `generateReport()` function:
- No I/O operations
- No side effects
- Fully testable
- Deterministic output

## Future Extensions

The report can easily be extended with:
- **Vocabulary stats**: unique word count, most common words
- **Sentence analysis**: sentence count per span, avg sentence length
- **Reading metrics**: estimated reading time, readability scores
- **Structure analysis**: heading detection, list detection
- **Language detection**: identify primary language
- **Custom thresholds**: user-configurable warning levels

All extensions can be added to `generate-report.ts` without changing the architecture.

## Step 1: Production Ready

With the addition of `buildReport.json`, **Step 1 is now fully production-ready**:

1. ✅ **spans.jsonl** - Structured paragraph data
2. ✅ **manifest.json** - Build metadata
3. ✅ **buildReport.json** - Quality metrics

Every build is now:
- Self-describing (manifest)
- Self-validating (report)
- Self-contained (all metadata included)
- Reproducible (deterministic outputs)
- Traceable (provenance links)

Next steps can build on this solid foundation: reader registry, node maps, or advanced processing.
