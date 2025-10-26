# Text Reader + Paragraph Splitter Implementation

## ✅ All Acceptance Criteria Met

### 1. Text Reader Module (`src/adapters/readers/text-reader.ts`)
- ✅ Reads files with `fs-extra`
- ✅ Normalizes text:
  - Converts `\r\n` → `\n`
  - Trims leading/trailing whitespace
  - Collapses multiple blank lines to one
- ✅ Generates `sourceHash` via `crypto.createHash('sha256')`

### 2. Paragraph Splitter (`src/core/segment/split-paragraphs.ts`)
- ✅ Splits on two or more newlines
- ✅ Trims each paragraph and drops empties
- ✅ Assigns sequential IDs (`span:000001`, `span:000002`, etc.)
- ✅ Assigns `order` metadata (0, 1, 2, ...)
- ✅ Validates each span with Zod schema

### 3. CLI Integration (`src/cli/index.ts`)
- ✅ Reads one file
- ✅ Produces array of spans
- ✅ Writes one JSON object per line to `<output>/spans.jsonl`
- ✅ Prints one-line summary with span count and output path
- ✅ Exits with code 0 on success, 1 on error

## Verification Results

```bash
$ node verify-acceptance.js
✓ spans.jsonl has 4 lines (≥ 1)
✓ No empty spans
✓ Order is strictly increasing: 0, 1, 2, 3
✓ IDs: span:000001, span:000002, span:000003, span:000004
✓ Reconstructed text length: 152 characters
✓ Normalized text length: 152 characters
✓ Re-concatenation matches normalized: YES
```

## Usage Examples

### Basic usage:
```bash
node dist/cli/index.js test-input/sample.txt
# Output: Processed 4 span(s) → dist/spans.jsonl
```

### With custom output directory:
```bash
node dist/cli/index.js test-input/sample.txt -o output
# Output: Processed 4 span(s) → output/spans.jsonl
```

### With verbose output:
```bash
node dist/cli/index.js test-input/sample.txt -v
# Shows: Processing file, source hash, text length, span count, etc.
```

## Example Output

### Input (`test-input/sample.txt`):
```

This is the first paragraph.
It has multiple lines.


This is the second paragraph.



This is the third paragraph after many blank lines.

Last paragraph.


```

### Output (`dist/spans.jsonl`):
```json
{"id":"span:000001","text":"This is the first paragraph.\nIt has multiple lines.","meta":{"order":0}}
{"id":"span:000002","text":"This is the second paragraph.","meta":{"order":1}}
{"id":"span:000003","text":"This is the third paragraph after many blank lines.","meta":{"order":2}}
{"id":"span:000004","text":"Last paragraph.","meta":{"order":3}}
```

## Edge Cases Handled

1. **Windows line endings** (`\r\n`): Properly converted to `\n`
2. **Empty files**: Exits with error "No paragraphs found in input file"
3. **Multiple blank lines**: Collapsed to single blank line during normalization
4. **Leading/trailing whitespace**: Trimmed from entire document and each paragraph

## Architecture Benefits

The implementation follows the layered architecture from CLAUDE.md:

- **Core logic** (`src/core/`): Pure, testable functions
- **Adapters** (`src/adapters/`): Handle all I/O
- **Pipeline** (`src/pipeline/`): Orchestrates the workflow
- **CLI** (`src/cli/`): User interface only
- **Utils** (`src/utils/`): Shared utilities

This separation makes it easy to:
- Unit test each component in isolation
- Add new input formats (PDF, EPUB, etc.)
- Add new output formats (JSON, XML, etc.)
- Extend the pipeline with new processing steps
