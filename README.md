# SRE (Static Research Engine)

> Transform documents into structured, queryable span artifacts with intelligent search and ranking

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

SRE is a modular TypeScript pipeline that transforms text-based documents into structured, queryable data artifacts. It provides document segmentation, hierarchical structure tracking, lexical search, and TF-IDF relevance ranking—all with a clean, deterministic API.

## Features

- 📝 **Document Processing** - Parse Markdown and plain text with auto-format detection
- ✂️ **Span Segmentation** - Split documents into paragraph spans with metadata
- 🏗️ **Structural Hints** - Track hierarchical structure (chapters, sections, headings)
- 📖 **Runtime Reader API** - Efficient read-only access to artifacts with O(1) lookups
- 🔍 **Lexical Search** - Fast, case-insensitive token matching with AND queries
- 🎯 **TF-IDF Ranking** - Relevance scoring with length normalization
- ⚡ **Zero Runtime Dependencies** - Lightweight reader with no external deps
- 🛠️ **CLI Tools** - Build pipeline and search utilities
- 🔬 **Deterministic** - Identical input produces identical output
- 📊 **Quality Metrics** - Build reports with span statistics and warnings

## Why SRE?

**The Problem:** LLMs are great at reasoning but terrible at reading large documents efficiently. Traditional RAG (Retrieval-Augmented Generation) systems are dynamic, probabilistic, and transient—each query reinterprets embeddings without persistent, deterministic understanding of the source text.

**The Solution:** SRE compiles documents into **static, structured knowledge artifacts** — like a build system for language understanding. Build once, query forever.

### How SRE Complements RAG

**SRE does not replace RAG — it enhances it.** Each serves a different role:

- **RAG** provides *immediate, dynamic context* using embeddings for fast recall
- **SRE** provides *persistent, deterministic structure* with full provenance

When combined:
1. **RAG** finds relevant snippets (dynamic recall)
2. **SRE** expands context by traversing structured corpus (deterministic discovery)

**RAG tells the agent where to look. SRE gives it everything it needs once it's there.**

### Static vs Dynamic Retrieval

| Aspect | Traditional RAG | SRE |
|--------|----------------|-----|
| **Data volatility** | Reinterprets embeddings per query | Fixed, compiled spans and indexes |
| **Cost** | Requires vector DB access | One-time compile, static files |
| **Determinism** | May vary by model or threshold | Bitwise reproducible builds |
| **Hosting** | Needs live vector DB | Works from static JSON on any filesystem |
| **Explainability** | Depends on vector similarity | Full provenance with manifest + nodeMap |

### Who It's For

✅ **Engineers and researchers** who need:
- Reproducible, explainable document retrieval for LLM pipelines
- Offline corpus preparation for LLM reasoning, QA, or summarization
- Static, local corpus foundation to complement RAG systems
- Provenance, structure, and deterministic builds

✅ **Use cases:**
- Knowledge bases and documentation compilers
- Offline research assistants and LLM tools
- Dataset preparation for fine-tuning or evaluation
- Analytical indexing (law, science, policy, technical docs)

> 📖 **Read more:** See [ABOUT.md](ABOUT.md) for the complete philosophy, including detailed comparison with RAG and how they work together.

## Installation

### From npm (when published)

```bash
# Global installation
npm install -g sre

# Project installation
npm install sre
```

### From source

```bash
# Clone the repository
git clone https://github.com/phillt/SRE.git
cd SRE

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Quick Start

### 1. Build a corpus from a document

```bash
# Process a Markdown file
sre input.md -o output/

# Process a plain text file
sre input.txt -o output/ --format=txt

# With verbose output
sre input.md -o output/ -v
```

This creates:
- `manifest.json` - Document metadata
- `spans.json` - Array of paragraph spans
- `nodeMap.json` - Hierarchical structure (for Markdown)
- `buildReport.json` - Quality metrics

### 2. Search the corpus

```bash
# Basic search
sre-search output/ "your query"

# With TF-IDF ranking
sre-search output/ "error handling" --rank=tfidf

# Limit results
sre-search output/ "section" --rank=tfidf --limit=5
```

### 3. Use the Reader API

```javascript
import { createReader } from 'sre'

// Load artifacts
const reader = await createReader('output/')

// Get document info
const manifest = reader.getManifest()
console.log(`${manifest.title}: ${manifest.spanCount} spans`)

// Search
const results = reader.search('error handling')

// Search with ranking
const ranked = reader.search('error handling', { rank: 'tfidf' })

// Get span by ID
const span = reader.getSpan('span:000001')

// Get context around a span
const contextIds = reader.neighbors('span:000003', { before: 1, after: 1 })

// Navigate sections
const sections = reader.listSections()
const section = reader.getSection('sec:000001')
```

## CLI Tools

### `sre` - Main build tool

Transform documents into span artifacts.

```bash
sre <input-file> [options]

Options:
  -o, --output <dir>   Output directory (default: dist/)
  --format <fmt>       Force format: md, txt (default: auto-detect)
  -v, --verbose        Verbose output
  -h, --help          Display help
```

**Examples:**
```bash
# Auto-detect format from extension
sre document.md -o dist/

# Force plain text parsing
sre notes.txt --format=txt -o output/

# Verbose mode
sre book.md -o book-output/ -v
```

### `sre-search` - Search with ranking

Query span artifacts with optional TF-IDF ranking.

```bash
sre-search <output-dir> <query> [options]

Options:
  --limit=N       Limit results to N spans
  --rank=tfidf    Enable TF-IDF relevance ranking

Examples:
  sre-search dist/ "error handling"
  sre-search dist/ "section" --rank=tfidf --limit=5
```

## API Documentation

### Reader API

The `Reader` class provides read-only access to artifacts:

```typescript
import { createReader } from 'sre'

const reader = await createReader('output-dir/')

// Document metadata
reader.getManifest(): Manifest
reader.getSpanCount(): number
reader.getBuildReport(): BuildReport | undefined
reader.getNodeMap(): NodeMap | undefined

// Span access
reader.getSpan(id: string): Span | undefined
reader.getByOrder(order: number): Span | undefined
reader.neighbors(id: string, opts?: NeighborsOptions): string[]

// Structure navigation
reader.listSections(): string[]
reader.getSection(id: string): { paragraphIds: string[] } | undefined

// Search
reader.search(query: string, opts?: SearchOptions): Span[]
reader.enableTfCache(size?: number): void
```

### Search Options

```typescript
interface SearchOptions {
  limit?: number          // Maximum results
  rank?: 'none' | 'tfidf' // Ranking method (default: 'none')
}
```

**Examples:**
```javascript
// Unranked search (document order)
const results = reader.search('error')

// Ranked by TF-IDF
const ranked = reader.search('error', { rank: 'tfidf' })

// Top 10 most relevant
const top10 = reader.search('query', { rank: 'tfidf', limit: 10 })

// Enable TF caching for better performance
reader.enableTfCache(100)
const cached = reader.search('query', { rank: 'tfidf' })
```

See [demo/reader/README.md](demo/reader/README.md) and [demo/search/README.md](demo/search/README.md) for detailed API documentation.

## Demos & Examples

The `demo/` directory contains interactive demonstrations and comprehensive tests:

```bash
# Run interactive demos
node demo/reader/demo.js      # Reader API demo
node demo/search/demo.js      # Search demo
node demo/ranking/demo.js     # TF-IDF ranking demo

# Run verification tests
node demo/reader/verify.js    # 26 tests
node demo/search/verify.js    # 17 tests
node demo/ranking/verify.js   # 12 tests

# Example CLI tool
node demo/reader/example-cli.js output/ info
```

See [demo/README.md](demo/README.md) for the complete demo guide.

## Project Structure

```
SRE/
├── src/              # TypeScript source
│   ├── cli/          # Command-line interface
│   ├── pipeline/     # Build orchestration
│   ├── core/         # Pure logic and schemas
│   ├── adapters/     # I/O (readers, writers)
│   └── utils/        # Shared utilities
├── bin/              # Production CLI tools
├── demo/             # Interactive demos and tests
│   ├── reader/       # Reader API demos (26 tests)
│   ├── search/       # Search demos (17 tests)
│   ├── ranking/      # Ranking demos (12 tests)
│   └── format-tracking/  # Format detection tests
├── docs/             # Technical implementation docs
└── dist/             # Compiled JavaScript (after build)
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Development

### Setup

```bash
# Clone and install
git clone https://github.com/phillt/SRE.git
cd SRE
npm install

# Build
npm run build

# Development mode (auto-rebuild)
npm run dev

# Format code
npm run format
```

### Running Tests

```bash
# Build first
npm run build

# Generate test corpus
node dist/cli/index.js test-input/sample.md -o dist/final-test
node dist/cli/index.js test-input/sample.txt -o dist/test-txt

# Run all verification tests
node demo/reader/verify.js && \
node demo/search/verify.js && \
node demo/ranking/verify.js

# Run demos
node demo/reader/demo.js
node demo/search/demo.js
node demo/ranking/demo.js
```

### Code Style

This project uses [Prettier](https://prettier.io/) for code formatting:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

## Architecture

SRE follows a **layered architecture**:

1. **CLI Layer** - User interface and argument parsing
2. **Pipeline Layer** - Orchestrates build process
3. **Core Layer** - Pure logic, schemas, transformations
4. **Adapters Layer** - I/O operations (filesystem, etc.)
5. **Utils Layer** - Shared utilities

**Design Principles:**
- Pure core, mutable edges
- Schema-driven development with Zod
- Single responsibility per module
- Deterministic output
- Zero runtime dependencies for Reader

See [CLAUDE.md](CLAUDE.md) for complete architecture details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code of Conduct
- How to report bugs
- How to suggest features
- Development workflow
- Pull request process
- Testing requirements

**Quick Start for Contributors:**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run build && node demo/*/verify.js`)
5. Format code (`npm run format`)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Documentation

### Philosophy & Overview
- [ABOUT.md](ABOUT.md) - Why SRE? Philosophy, design rationale, and comparison with RAG

### User Documentation
- [Demo Guide](demo/README.md) - Interactive examples and verification tests
- [Reader API](demo/reader/README.md) - Runtime API documentation
- [Lexical Search](demo/search/README.md) - Search functionality
- [TF-IDF Ranking](demo/ranking/README.md) - Relevance ranking

### Technical Documentation
- [CLAUDE.md](CLAUDE.md) - Architecture and development guide
- [Implementation Docs](docs/) - Technical implementation details
- Feature docs in `demo/*/` directories

## Roadmap

Potential future enhancements:

- [ ] BM25 ranking algorithm
- [ ] Semantic search with embeddings
- [ ] PDF and EPUB support
- [ ] Boolean search operators (AND, OR, NOT)
- [ ] Phrase matching ("exact phrase" queries)
- [ ] Fuzzy matching for typos
- [ ] Incremental updates to artifacts
- [ ] HTTP API server
- [ ] Web UI for exploration

## Performance

- **Index Building**: < 10ms for 1,000 spans
- **Lexical Search**: < 1ms for typical queries
- **TF-IDF Ranking**: < 3ms for ranked queries
- **Memory**: ~1KB per span in memory

## License

[MIT License](LICENSE) - Copyright (c) 2024 phillt

## Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Zod](https://zod.dev/) - Schema validation
- [Commander](https://github.com/tj/commander.js) - CLI framework
- [Prettier](https://prettier.io/) - Code formatting

## Support

- **Issues**: [GitHub Issues](https://github.com/phillt/SRE/issues)
- **Discussions**: [GitHub Discussions](https://github.com/phillt/SRE/discussions)
- **Documentation**: [Demo Guide](demo/README.md)

---

Made with ❤️ by [phillt](https://github.com/phillt)
