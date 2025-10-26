# Format Tracking Verification

Verification tests for format detection and tracking throughout the build pipeline.

## Overview

The SRE build pipeline tracks the input format (Markdown or plain text), how it was detected (auto vs explicit), and which reader was used. This information is recorded in both the manifest and build report for transparency.

## Files

- **`verify.js`** - Comprehensive format tracking verification tests

## Running

```bash
# From project root
node demo/format-tracking/verify.js
```

Tests:
- Auto-detection from file extension (`.md` vs `.txt`)
- Explicit `--format` flag override
- Format recorded in manifest.json
- Format recorded in buildReport.json
- Detection method tracking (`auto` vs `explicit`)

## What's Tracked

### In manifest.json

```json
{
  "format": "md",
  "detection": "auto",
  "reader": "text"
}
```

**Fields:**
- `format`: Input format (`"md"` or `"txt"`)
- `detection`: How format was determined (`"auto"` or `"explicit"`)
- `reader`: Reader type used (`"text"` for both currently)

### In buildReport.json

```json
{
  "provenance": {
    "format": "md",
    "detection": "auto"
  }
}
```

Same fields as manifest, stored in provenance section.

## Test Scenarios

### 1. Auto-detection with .md file

```bash
node dist/cli/index.js sample.md -o output
```

Expected:
- `format: "md"`
- `detection: "auto"`
- Markdown parsing (headings, sections)

### 2. Auto-detection with .txt file

```bash
node dist/cli/index.js sample.txt -o output
```

Expected:
- `format: "txt"`
- `detection: "auto"`
- Plain text parsing (paragraphs only)

### 3. Explicit --format=md

```bash
node dist/cli/index.js sample.txt --format=md -o output
```

Expected:
- `format: "md"`
- `detection: "explicit"`
- Markdown parsing despite .txt extension

### 4. Explicit --format=txt

```bash
node dist/cli/index.js sample.md --format=txt -o output
```

Expected:
- `format: "txt"`
- `detection: "explicit"`
- Plain text parsing despite .md extension

## Why Track Format?

### 1. Transparency

Users can verify:
- What format was used to build artifacts
- Whether auto-detection or manual override was used
- What parsing behavior occurred

### 2. Debugging

When output is unexpected:
- Check if wrong format was detected
- Verify if override was applied correctly
- Understand which parser ran

### 3. Reproducibility

Artifacts include complete provenance:
- Input file → Format → Parser → Output
- Can reproduce builds exactly
- Can audit processing pipeline

### 4. Future Compatibility

If we add more formats (HTML, PDF):
- Clear versioning of format field
- Easy to understand what each artifact contains
- Graceful migration path

## Format Detection Logic

### Auto-detection (default)

Based on file extension:

```typescript
const ext = path.extname(inputPath).toLowerCase()

if (ext === '.md') {
  format = 'md'
} else if (ext === '.txt') {
  format = 'txt'
} else {
  throw new Error('Unknown extension, use --format')
}
```

### Explicit override

User can force a format:

```bash
--format=md   # Always use Markdown parser
--format=txt  # Always use plain text parser
```

## Implementation Details

### CLI Layer

```typescript
// Parse CLI flags
const { format: explicitFormat, inputPath } = parseArgs()

// Detect format
let format: 'md' | 'txt'
let detection: 'auto' | 'explicit'

if (explicitFormat) {
  format = explicitFormat
  detection = 'explicit'
} else {
  format = autoDetectFormat(inputPath)
  detection = 'auto'
}

// Pass to pipeline
await runPipeline({ format, detection, ...opts })
```

### Pipeline Layer

```typescript
// Store in state
state.format = format
state.detection = detection

// Use in manifest
manifest.format = state.format
manifest.detection = state.detection

// Use in report
report.provenance.format = state.format
report.provenance.detection = state.detection
```

## Error Handling

### Unknown extension

```bash
node dist/cli/index.js sample.pdf -o output
```

Error: "Unknown extension .pdf, use --format=md or --format=txt"

### Missing format flag

```bash
node dist/cli/index.js sample -o output
```

Error: "Cannot detect format from 'sample', use --format"

### Invalid format value

```bash
node dist/cli/index.js sample.md --format=html -o output
```

Error: "Invalid format 'html', must be 'md' or 'txt'"

## Future Enhancements

### More Formats

```typescript
type Format = 'md' | 'txt' | 'html' | 'pdf' | 'docx'
```

Add support for:
- HTML (strip tags, extract text)
- PDF (extract text, preserve structure)
- DOCX (parse Word documents)

### Content-Based Detection

Instead of just extension:
```typescript
function detectFormat(content: string): Format {
  if (hasMarkdownSyntax(content)) return 'md'
  if (hasHTMLTags(content)) return 'html'
  return 'txt'
}
```

### Format Versions

Track format schema versions:
```json
{
  "format": "md",
  "formatVersion": "1.0",
  "detection": "auto"
}
```

## Test Coverage

The `verify.js` script tests:
- ✅ Auto-detection from .md extension
- ✅ Auto-detection from .txt extension
- ✅ Explicit --format=md override
- ✅ Explicit --format=txt override
- ✅ Format in manifest matches expectation
- ✅ Format in buildReport matches manifest
- ✅ Detection method correctly recorded

## Next Steps

- Explore reader API: `../reader/demo.js`
- Check build pipeline: `../../src/cli/`, `../../src/core/`
- Read full docs: `FORMAT_TRACKING.md`
