# Text Reader and Normalizer Implementation

## ✅ Complete

The text reader module is the foundation of the spanizer pipeline. It reads input files, normalizes text for consistency, and provides metadata for downstream processing.

## Location

```
src/adapters/readers/text-reader.ts
```

Export: `readTextFile(filePath: string): Promise<TextFileResult>`

## Features

### 1. File Reading
- Uses `fs-extra` for robust file I/O
- Resolves to absolute paths using `path.resolve()`
- Reads files as UTF-8
- Captures original file size in bytes

### 2. Text Normalization
The normalizer applies the following transformations (in order):

1. **Unicode NFC Normalization**: `.normalize('NFC')` ensures consistent Unicode representation across platforms
2. **Line Ending Normalization**: Converts Windows `\r\n` → Unix `\n`
3. **Whitespace Trimming**: Removes leading/trailing whitespace
4. **Blank Line Collapsing**: Multiple consecutive blank lines → single blank line

### 3. Metadata Generation
- **sourcePath**: Absolute file path
- **sourceHash**: SHA-256 hash of normalized text (deterministic)
- **byteLength**: Original file size in bytes
- **text**: Normalized text content

## Output Interface

```typescript
interface TextFileResult {
  text: string           // normalized text
  sourcePath: string     // absolute file path
  sourceHash: string     // SHA-256 hash of normalized text
  byteLength: number     // original file size in bytes
}
```

## Verification Tests

All tests pass ✅

### Test 1: Metadata Verification
- Returns absolute path
- Provides accurate byte length
- Generates consistent hash
- Text length matches normalized content

### Test 2: Hash Consistency
- Same input → same hash (deterministic)
- Hash remains identical across multiple runs

### Test 3: Line Ending Normalization
- Windows CRLF (`\r\n`) converted to Unix LF (`\n`)
- No `\r` characters remain in output
- Works correctly with files from different platforms

### Test 4: Unicode NFC Normalization
- NFC (composed) and NFD (decomposed) Unicode produce identical output
- Example: `café` (NFC) and `café` (NFD) → same hash after normalization
- Ensures consistency across different text editors and platforms

### Test 5: Blank Line Collapsing
- Multiple blank lines collapse to single blank line
- No triple newlines (`\n\n\n`) in output
- Preserves paragraph boundaries with double newlines (`\n\n`)

### Test 6: Whitespace Trimming
- No leading whitespace at start of file
- No trailing whitespace at end of file
- Internal whitespace preserved within paragraphs

## Usage Examples

### Basic Usage (CLI Integration)
```bash
node dist/cli/index.js test-input/sample.txt -v
```

Output:
```
Reading and normalizing text...
Source path: /home/philllt/Projects/apps/SRE/test-input/sample.txt
Source hash: 904f64c3578a08a3deb2e13aa678d8cc615859380c5e3606451086fb436ed88e
Original size: 160 bytes
Normalized text length: 152 characters
```

### Direct Usage (Demo)
```bash
node demo-reader.js test-input/sample.txt
```

Output:
```
📄 Text Reader Output

Metadata:
  Source Path: /home/philllt/Projects/apps/SRE/test-input/sample.txt
  Source Hash: 904f64c3578a08a3deb2e13aa678d8cc615859380c5e3606451086fb436ed88e
  Byte Length: 160 bytes
  Text Length: 152 characters

Normalized Text:
────────────────────────────────────────────────────────────
This is the first paragraph.
It has multiple lines.

This is the second paragraph.

This is the third paragraph after many blank lines.

Last paragraph.
────────────────────────────────────────────────────────────
```

### Programmatic Usage
```typescript
import { readTextFile } from './src/adapters/readers/text-reader.js'

const result = await readTextFile('input.txt')

console.log(result.sourcePath)  // Absolute path
console.log(result.sourceHash)  // SHA-256 hash
console.log(result.byteLength)  // Original size
console.log(result.text)        // Normalized text
```

## Architecture

The text reader follows the layered architecture:

```
src/adapters/readers/text-reader.ts  ← I/O adapter
    ↓ uses
src/core/normalize/normalize-text.ts  ← Pure normalization logic
    ↓ uses
src/utils/hash.ts                     ← Utility for hashing
```

This separation ensures:
- **Core logic is pure and testable** (no I/O in normalize module)
- **Adapters handle I/O** (file reading, path resolution)
- **Clear dependency flow** (adapters → core → utils)

## Files Created/Modified

### New Files
- `demo-reader.js` - Demo script to show normalized output
- `verify-reader.js` - Comprehensive test suite

### Modified Files
- `src/adapters/readers/text-reader.ts` - Enhanced with metadata fields
- `src/core/normalize/normalize-text.ts` - Added Unicode NFC normalization
- `src/pipeline/spanize.ts` - Updated to use new interface
- `src/cli/index.ts` - (no changes needed, works via pipeline)

## Next Steps

The text reader is now ready for the paragraph splitter to use. The pipeline flow is:

1. **Text Reader** (✅ Complete) - Reads and normalizes text
2. **Paragraph Splitter** (✅ Already integrated) - Splits into spans
3. **JSONL Writer** (✅ Already integrated) - Outputs structured data

The complete pipeline is functional and tested!
