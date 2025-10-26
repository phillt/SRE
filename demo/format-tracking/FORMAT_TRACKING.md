# Format Tracking Implementation

## ✅ Complete

Format tracking has been added to record the resolved format and detection method in all outputs.

## What Changed

### Schema Updates

**File:** `src/core/contracts/manifest.ts`

Added three new fields to ManifestSchema:
```typescript
export const ManifestSchema = z.object({
  // ... existing fields ...
  format: z.string(),                    // Resolved format (e.g., "md", "markdown", "txt")
  detection: z.enum(['auto', 'flag']),   // How format was determined
  reader: z.string(),                     // Reader name used (e.g., "text")
  // ... rest of fields ...
})
```

**File:** `src/core/contracts/report.ts`

Added two new fields to ProvenanceSchema:
```typescript
export const ProvenanceSchema = z.object({
  // ... existing fields ...
  format: z.string(),                    // Resolved format
  detection: z.enum(['auto', 'flag']),   // Detection method
})
```

### Pipeline Updates

**File:** `src/pipeline/spanize.ts`

Track detection method and populate manifest:
```typescript
// Detect format and track method
const format = detectFormat(inputPath, options.format)
const detection: 'auto' | 'flag' = options.format ? 'flag' : 'auto'
const reader = getReaderFor(format)

// Include in manifest
const manifest: Manifest = {
  // ... existing fields ...
  format,
  detection,
  reader: reader.name,
  // ... rest of fields ...
}
```

### Report Generator Updates

**File:** `src/core/validate/generate-report.ts`

Extract format fields from manifest for provenance:
```typescript
const provenance: Provenance = {
  id: manifest.id,
  sourceHash: manifest.sourceHash,
  createdAt: manifest.createdAt,
  version: manifest.version,
  format: manifest.format,          // Added
  detection: manifest.detection,    // Added
}
```

## How It Works

### Detection Method Tracking

The `detection` field records how the format was determined:
- **`auto`**: Format auto-detected from file extension
- **`flag`**: Format explicitly specified via `--format` flag

### Format Recording

The `format` field records the exact format string that was resolved:
- Could be file extension (e.g., "md", "txt")
- Could be format alias (e.g., "markdown", "text")
- Always matches one of the supported formats

### Reader Recording

The `reader` field records which reader adapter was used:
- Currently: "text" (for TextReaderAdapter)
- Future: "pdf", "docx", etc. as more readers are added

## Output Examples

### Auto-Detection

**Command:**
```bash
sre document.md
```

**manifest.json:**
```json
{
  "format": "md",
  "detection": "auto",
  "reader": "text"
}
```

**buildReport.json provenance:**
```json
{
  "provenance": {
    "format": "md",
    "detection": "auto"
  }
}
```

### Explicit Format

**Command:**
```bash
sre document.md --format markdown
```

**manifest.json:**
```json
{
  "format": "markdown",
  "detection": "flag",
  "reader": "text"
}
```

**buildReport.json provenance:**
```json
{
  "provenance": {
    "format": "markdown",
    "detection": "flag"
  }
}
```

### Format Override

**Command:**
```bash
sre notes.txt --format md
```

**manifest.json:**
```json
{
  "format": "md",
  "detection": "flag",
  "reader": "text"
}
```

**buildReport.json provenance:**
```json
{
  "provenance": {
    "format": "md",
    "detection": "flag"
  }
}
```

## Use Cases

### Debugging Pipeline Issues

When troubleshooting processing problems, you can now see:
- What format was actually used
- Whether auto-detection or explicit format was used
- Which reader adapter handled the file

### Auditing Builds

For reproducibility and quality control:
- Track exactly how each file was processed
- Verify correct format detection
- Ensure consistent reader usage

### Format Migration

When adding new readers or changing format detection:
- Compare detection methods across builds
- Verify format resolution consistency
- Track reader usage patterns

## Verification

All acceptance criteria met ✅

### Test 1: Auto-Detection
- ✅ `sre sample.md` records format="md", detection="auto"
- ✅ Both manifest and report include format fields
- ✅ Reader field shows "text"

### Test 2: Explicit Format
- ✅ `sre sample.md --format md` records detection="flag"
- ✅ Format matches specified value
- ✅ Works with both primary and alias formats

### Test 3: Format Override
- ✅ `sre sample.txt --format markdown` records format="markdown"
- ✅ Detection shows "flag" correctly
- ✅ Override works across different extensions

### Test 4: Schema Validation
- ✅ Manifest schema enforces new fields
- ✅ Report schema enforces provenance fields
- ✅ Zod validation passes for all outputs

### Test 5: Backward Compatibility
- ✅ No breaking changes to existing code
- ✅ All previous tests still pass
- ✅ Build succeeds without errors

## Testing

Run the verification script:
```bash
node verify-format-tracking.js
```

This tests:
1. Auto-detection with .md file
2. Explicit format with --format md
3. Format override with --format markdown

All tests verify:
- Manifest contains correct format, detection, reader
- Report provenance contains correct format, detection
- Values match expected for each scenario

## Benefits

### Transparency
- See exactly how your files were processed
- Understand format resolution decisions
- Track reader selection

### Debugging
- Quickly identify format detection issues
- Verify override flags work correctly
- Trace processing pipeline

### Provenance
- Complete audit trail for each build
- Link reports back to processing method
- Support reproducible builds

### Future-Proofing
- Ready for multiple reader types
- Supports format aliases
- Enables format migration tracking

## Summary

Format tracking required:
- ✅ 3 schema fields added (manifest)
- ✅ 2 schema fields added (report provenance)
- ✅ Detection method tracking in pipeline
- ✅ Format extraction in report generator
- ✅ Zero breaking changes
- ✅ Full test coverage

This enhancement improves build transparency and debugging capabilities while maintaining the clean architecture!
