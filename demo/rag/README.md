# RAG Prompt Assembly

**Convert retrieval packs into LLM-ready prompts with citations**

RAG Prompt Assembly extends SRE's retrieval capabilities by transforming search results into structured prompts ready for LLM consumption. It handles citation management, budget constraints, and provides deterministic output for reproducible RAG applications.

## Quick Start

```javascript
import { createReader } from 'sre/runtime'

const reader = await createReader('output/')

// Step 1: Retrieve relevant context packs
const packs = reader.retrieve('machine learning', {
  limit: 5,
  perHitNeighbors: 1,
  rank: 'tfidf'
})

// Step 2: Assemble into a prompt
const assembled = reader.assemblePrompt({
  question: 'What is machine learning?',
  packs: packs
})

// Step 3: Use with your LLM
console.log('System:', assembled.prompt.system)
console.log('User:', assembled.prompt.user)
console.log('Citations:', assembled.citations)
```

## Core Concept

**Problem**: Retrieved context needs to be formatted into a structured prompt with proper citations and budget management.

**Solution**: `assemblePrompt()` automatically:
- Formats context blocks with citation markers
- Builds system and user prompts
- Maps citations to source metadata
- Enforces budget constraints with headroom
- Produces deterministic, reproducible output

## API

### `reader.assemblePrompt(options)`

Converts retrieval packs into a structured prompt with citations.

**Parameters**:
- `question` (string): The user's question or instruction
- `packs` (RetrievalPack[]): Retrieved context packs (from `retrieve()`)
- `headroomTokens` (number, optional): Safety buffer for budget (default: 300)
- `style` ('qa' | 'summarize', optional): Prompt style (default: 'qa')
- `citationStyle` ('numeric' | 'footnote', optional): Citation format (default: 'numeric')

**Returns**: `AssembledPrompt`

## AssembledPrompt Structure

```typescript
{
  prompt: {
    system: string        // System instructions for the LLM
    user: string          // User prompt with question + context blocks
  },
  citations: Array<{
    marker: string        // Citation marker (e.g., "[¹]", "[²]")
    packId: string        // Pack ID this citation references
    docId: string         // Document ID (from manifest)
    headingPath: string[] // Section path in document
    spanOffsets?: Array<[number, number]>  // Optional phrase hit positions
  }>,
  tokensEstimated: number // Total estimated tokens (chars)
}
```

## Prompt Styles

### QA Style (default)

Optimized for question answering with grounded responses.

```javascript
const assembled = reader.assemblePrompt({
  question: 'What are neural networks?',
  packs: packs,
  style: 'qa'  // default
})

// System prompt includes:
// - Instructions to answer based on context
// - Requirement to cite sources
// - Guidance to abstain if insufficient information
```

### Summarize Style

Optimized for content summarization.

```javascript
const assembled = reader.assemblePrompt({
  question: 'Summarize the key concepts',
  packs: packs,
  style: 'summarize'
})

// System prompt includes:
// - Instructions to create concise summary
// - Requirement to cite sources
// - Guidance to stay within provided context
```

## Citation Format

### Numeric Citations (default)

Uses Unicode superscript numbers for compact citations.

```javascript
const assembled = reader.assemblePrompt({
  question: 'What is this about?',
  packs: packs,
  citationStyle: 'numeric'  // default
})

// Produces markers: [¹], [²], [³], ...
// User prompt includes: "You may reference [¹]…[³]."
```

### Context Block Format

Each pack is formatted as:

```
[¹]
Doc: corpus:abc123
Path: Chapter 3 > Section 3.2
---
<paragraph text here>

<more paragraphs if multi-span pack>
```

## Budget Management

The `headroomTokens` parameter provides a safety buffer to ensure the final prompt doesn't exceed token limits.

### How It Works

1. Base prompt size calculated (system + user question)
2. Packs added in order (highest score first)
3. Stop before exceeding: `baseSize + contextSize + headroomTokens`
4. Dropped packs are always lowest-scoring

### Example

```javascript
// Retrieve many candidate packs
const packs = reader.retrieve('common term', {
  limit: 20,
  rank: 'tfidf'
})

// Tight budget - will drop lowest-scoring packs
const assembled = reader.assemblePrompt({
  question: 'What does this discuss?',
  packs: packs,
  headroomTokens: 100  // Reserve 100 tokens for model response
})

console.log(`Used ${assembled.citations.length} of ${packs.length} packs`)
console.log(`Estimated tokens: ${assembled.tokensEstimated}`)
```

### Budget Strategy

- **Default headroom**: 300 tokens (safe for most use cases)
- **Tight budgets**: Use lower headroom, more packs will be dropped
- **Loose budgets**: Use higher headroom for safety
- **No budget**: Set very high headroom (e.g., 100000)

## Determinism Guarantees

`assemblePrompt()` is fully deterministic:

✅ Same inputs → identical output (bitwise reproducible)
✅ Citation order matches pack order (score desc, order asc)
✅ No randomness in marker assignment
✅ Stable pack dropping order (lowest score last)
✅ Unicode normalization preserved from corpus

## Integration Example

Complete RAG pipeline:

```javascript
import { createReader } from 'sre/runtime'

const reader = await createReader('output/')

// 1. Retrieve relevant context
const packs = reader.retrieve('neural networks', {
  limit: 5,
  perHitNeighbors: 2,
  expand: 'neighbors',
  rank: 'tfidf'
})

// 2. Assemble prompt
const assembled = reader.assemblePrompt({
  question: 'Explain neural networks',
  packs: packs,
  headroomTokens: 200
})

// 3. Call your LLM
const response = await callLLM({
  system: assembled.prompt.system,
  user: assembled.prompt.user
})

// 4. Display with citations
console.log('Answer:', response)
console.log('Sources:')
for (const citation of assembled.citations) {
  console.log(`${citation.marker} ${citation.packId}`)
  console.log(`   Path: ${citation.headingPath.join(' > ')}`)
}
```

## Edge Cases

### Empty Packs

Returns minimal prompt with question only:

```javascript
const assembled = reader.assemblePrompt({
  question: 'What is this?',
  packs: []
})

// assembled.citations = []
// assembled.prompt.user = "What is this?"
```

### Missing Heading Paths

Gracefully handled - context blocks omit the Path line:

```
[¹]
Doc: corpus:abc123
---
<text content>
```

### Non-ASCII Content

All Unicode is preserved:

```javascript
const assembled = reader.assemblePrompt({
  question: 'What is 机器学习?',
  packs: packs
})

// Markers use superscript: [¹], [²], etc.
// Question and content preserve UTF-8
```

## Token Estimation

Token estimation uses a simple character count heuristic:

```
estimatedTokens ≈ characterCount
```

This is conservative for English text (actual ratio ~4:1 chars:tokens). Adjust your `headroomTokens` accordingly:

- English: Use headroom × 0.75 for typical text
- Code: Use headroom × 1.0 (higher token density)
- Other languages: Varies by language

## Testing

Run verification tests:

```bash
npm run build
node demo/rag/verify.js
```

Run interactive demo:

```bash
npm run build
node demo/rag/demo.js
```

## Design Rationale

### Why separate retrieve() and assemblePrompt()?

1. **Flexibility**: Use retrieval without prompts (e.g., for display)
2. **Composability**: Different prompt styles for same retrieval
3. **Budget control**: Final safety check after retrieval
4. **Testing**: Each stage can be tested independently

### Why numeric superscripts?

- **Compact**: Minimal visual noise
- **Clear**: Easily distinguishable from content
- **Universal**: Works across all LLMs
- **Sortable**: Natural ordering for citations

### Why character-based token estimation?

- **Fast**: No tokenizer dependency
- **Universal**: Works across all models
- **Conservative**: Overestimates for safety
- **Deterministic**: Same input → same estimate

## Next Steps

After `assemblePrompt()`, the next typical step is **RAG Answer v0**:
- Call LLM with assembled prompt
- Parse response for citations
- Validate citations against citation map
- Return structured answer with verified sources

See the main SRE documentation for the complete RAG pipeline.
