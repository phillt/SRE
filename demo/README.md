# SRE Demos & Verification

This directory contains interactive demos, example tools, and verification tests for the SRE (Span Reader Engine) system.

## Directory Structure

```
demo/
├── reader/          - Runtime Reader API demos and tests
├── search/          - Lexical Search demos and tests
├── ranking/         - TF-IDF Ranking demos and tests
└── format-tracking/ - Format detection verification tests
```

## Quick Start

### Prerequisites

1. Build the project:
   ```bash
   npm run build
   ```

2. Generate test artifacts:
   ```bash
   # Create test corpus
   node dist/cli/index.js demo/test-input/sample.md -o dist/final-test
   node dist/cli/index.js demo/test-input/sample.txt -o dist/test-txt
   ```

### Running Demos

Each demo is an interactive script showing system features:

```bash
# Reader API demo
node demo/reader/demo.js

# Lexical search demo
node demo/search/demo.js

# TF-IDF ranking demo
node demo/ranking/demo.js
```

### Running Verification Tests

Each area has comprehensive verification tests:

```bash
# Reader tests (26 tests)
node demo/reader/verify.js

# Search tests (17 tests)
node demo/search/verify.js

# Ranking tests (12 tests)
node demo/ranking/verify.js

# Format tracking tests
node demo/format-tracking/verify.js
```

### Run All Tests

```bash
# Quick test script
node demo/reader/verify.js && \
node demo/search/verify.js && \
node demo/ranking/verify.js && \
echo "✅ All demo tests passed!"
```

## Feature Areas

### 1. Reader (`reader/`)

Runtime API for loading and querying span artifacts.

**Features:**
- Load artifacts from disk
- Query spans by ID or document order
- Get neighboring spans (context expansion)
- Navigate hierarchical structure (sections, chapters)
- Access build quality metrics

**Files:**
- `demo.js` - Interactive demo of Reader features
- `example-cli.js` - Command-line query tool
- `verify.js` - 26 comprehensive tests

[See reader/README.md](./reader/README.md)

### 2. Search (`search/`)

Lexical search with exact token matching.

**Features:**
- Case-insensitive token matching
- Multi-word AND queries
- Markdown/punctuation stripping
- Lazy index building
- Result limiting

**Files:**
- `demo.js` - Interactive search examples
- `verify.js` - 17 comprehensive tests

[See search/README.md](./search/README.md)

### 3. Ranking (`ranking/`)

TF-IDF relevance ranking for search results.

**Features:**
- Log-normalized TF scoring
- IDF from global index
- Length normalization
- Optional TF caching (LRU)
- Deterministic tie-breaking

**Files:**
- `demo.js` - Ranked vs unranked comparisons
- `verify.js` - 12 comprehensive tests

[See ranking/README.md](./ranking/README.md)

### 4. Format Tracking (`format-tracking/`)

Verification of format detection and tracking.

**Features:**
- Auto-detection from file extension
- Explicit `--format` flag override
- Format recorded in manifest and report
- Detection method tracking

**Files:**
- `verify.js` - Format tracking tests

[See format-tracking/README.md](./format-tracking/README.md)

## Development Workflow

### Adding New Features

1. Implement feature in `src/`
2. Build: `npm run build`
3. Create demo script in appropriate `demo/` subdirectory
4. Create verification tests
5. Update relevant README.md
6. Run tests to ensure everything passes

### Demo Script Guidelines

- Use `#!/usr/bin/env node` shebang
- Import from `../../dist/runtime/api/index.js`
- Use test data from `../../dist/final-test` or `../../dist/test-txt`
- Show both basic and advanced usage
- Include error handling
- Make scripts executable with `chmod +x`

### Verification Test Guidelines

- Test all acceptance criteria
- Use test/testAsync helper functions
- Show clear pass/fail with ✅/❌
- Print summary at end
- Exit with code 0 (success) or 1 (failure)
- Test edge cases and error conditions

## Test Data

Demo scripts use pre-built test corpora:

- **`dist/final-test/`** - Markdown sample with structure
  - 9 spans
  - 2 chapters, 3 sections
  - Nested headings (H1, H2, H3)
  - Rich formatting (bold, code, lists)

- **`dist/test-txt/`** - Plain text sample
  - 3 paragraphs
  - No markdown syntax
  - Synthetic section structure

## Production Tools

Production CLI tools are in `../bin/`:

- `../bin/sre-search.js` - Full-featured search CLI with ranking

These are separate from demos and intended for end-user use.

## Additional Resources

- **Search Documentation**: `search/LEXICAL_SEARCH.md`, `search/SEARCH_SUMMARY.md`
- **Reader Documentation**: `reader/RUNTIME_READER.md`
- **Format Tracking**: `format-tracking/FORMAT_TRACKING.md`
- **Implementation Docs**: `../docs/` (technical implementation details)
- **Build Pipeline**: `../src/cli/`, `../src/core/`
- **Runtime API**: `../src/runtime/api/`
- **Search Implementation**: `../src/runtime/search/`

## Summary

- ✅ **55+ tests** across all verification scripts
- ✅ **4 demo areas** with interactive examples
- ✅ **Example CLI tools** for hands-on exploration
- ✅ **Comprehensive documentation** in each subdirectory

All demos are self-contained and can run independently. Happy exploring! 🚀
