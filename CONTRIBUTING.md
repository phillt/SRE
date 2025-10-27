# Contributing to SRE

Thank you for your interest in contributing to SRE (Static Research Engine)! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [How to Contribute](#how-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone, regardless of background or identity.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Accepting constructive criticism gracefully
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment, trolling, or insulting comments
- Personal or political attacks
- Publishing others' private information
- Any conduct that could be considered inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying standards and will take appropriate action in response to unacceptable behavior.

## Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn**
- **Git**
- **TypeScript** knowledge (helpful but not required)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/SRE.git
   cd SRE
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/phillt/SRE.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Build the project:**
   ```bash
   npm run build
   ```

6. **Generate test corpus:**
   ```bash
   node dist/cli/index.js test-input/sample.md -o dist/final-test
   node dist/cli/index.js test-input/sample.txt -o dist/test-txt
   ```

7. **Run verification tests:**
   ```bash
   node demo/reader/verify.js
   node demo/search/verify.js
   node demo/ranking/verify.js
   ```

## Development Workflow

### Creating a Feature Branch

```bash
# Update your fork with latest changes
git checkout master
git pull upstream master

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the appropriate layer:
   - `src/cli/` - CLI interface changes
   - `src/pipeline/` - Build process orchestration
   - `src/core/` - Core logic, schemas, algorithms
   - `src/adapters/` - I/O operations
   - `src/utils/` - Shared utilities

2. Follow the [layered architecture](CLAUDE.md#repository-structure):
   - Keep core logic pure (no I/O)
   - Use Zod schemas for all data structures
   - Write single-purpose modules

3. **Build frequently:**
   ```bash
   npm run dev  # Auto-rebuild on changes
   ```

4. **Test your changes:**
   ```bash
   npm run build
   node demo/*/verify.js  # Run relevant tests
   ```

### Committing

Write clear, descriptive commit messages:

```bash
git commit -m "Add: Brief description of what was added"
git commit -m "Fix: What bug was fixed"
git commit -m "Refactor: What was refactored and why"
```

**Good commit messages:**
- `Add: TF-IDF caching with LRU eviction`
- `Fix: Handle empty queries in search index`
- `Refactor: Extract tokenization logic to separate module`
- `Docs: Update README with new API examples`

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Fixes** - Fix issues and improve reliability
2. **New Features** - Add new capabilities (discuss first!)
3. **Documentation** - Improve docs, add examples
4. **Tests** - Add test coverage, fix flaky tests
5. **Performance** - Optimize algorithms, reduce memory usage
6. **Refactoring** - Improve code quality without changing behavior

### Before You Start

For **significant changes**:
1. **Open an issue** to discuss the proposed change
2. Wait for maintainer feedback
3. Ensure the change aligns with project goals

For **minor changes** (typos, small bug fixes):
- Feel free to submit a PR directly

## Reporting Bugs

### Before Submitting

- **Search existing issues** to avoid duplicates
- **Try the latest version** to see if it's already fixed
- **Reproduce the bug** with a minimal example

### Bug Report Template

```markdown
## Bug Description
Clear description of what went wrong.

## Steps to Reproduce
1. Run `sre input.md -o output/`
2. Execute `sre-search output/ "query"`
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- SRE version: 1.0.0
- Node.js version: 18.16.0
- OS: macOS 13.4 / Ubuntu 22.04 / Windows 11

## Additional Context
Any other relevant information, logs, or screenshots.
```

## Suggesting Features

### Before Submitting

- **Check existing issues** for similar requests
- **Consider the scope** - does it fit the project goals?
- **Think about implementation** - is it feasible?

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature.

## Motivation
Why is this feature needed? What problem does it solve?

## Proposed Solution
How could this be implemented?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Examples, mockups, or references to similar features elsewhere.
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass:**
   ```bash
   npm run build
   node demo/reader/verify.js
   node demo/search/verify.js
   node demo/ranking/verify.js
   ```

2. **Format code:**
   ```bash
   npm run format
   ```

3. **Update documentation** if needed:
   - Update README.md for API changes
   - Update relevant files in `demo/` or `docs/`
   - Add JSDoc comments to new functions

4. **Add tests** for new functionality:
   - Add verification tests in `demo/*/verify.js`
   - Add demo examples in `demo/*/demo.js`

### PR Template

```markdown
## Description
Brief description of changes.

## Related Issue
Fixes #123 (if applicable)

## Changes Made
- Added X feature to Y module
- Updated Z documentation
- Fixed W bug in V

## Testing
- [ ] All existing tests pass
- [ ] Added new tests for new functionality
- [ ] Manually tested with sample data

## Checklist
- [ ] Code follows project style guidelines
- [ ] Code is properly formatted (ran `npm run format`)
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] Build succeeds (`npm run build`)
```

### Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be credited in release notes

## Coding Standards

### TypeScript Style

- Use TypeScript for all new code
- Enable strict mode
- Provide type annotations for public APIs
- Avoid `any` unless absolutely necessary

### Formatting

- Use **Prettier** for consistent formatting
- Run `npm run format` before committing
- 2-space indentation
- Semicolons required
- Single quotes for strings

### Naming Conventions

- **Files:** kebab-case (`text-reader.ts`, `split-paragraphs.ts`)
- **Classes:** PascalCase (`TextReader`, `LexicalIndex`)
- **Functions:** camelCase, verb-first (`normalizeText`, `buildIndex`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_SPAN_LENGTH`)
- **Interfaces:** PascalCase, no 'I' prefix (`SearchOptions`, not `ISearchOptions`)

### Code Organization

- **One responsibility per module**
- **Pure functions in `core/`** (no side effects)
- **I/O only in `adapters/`**
- **Keep files focused** (< 200 lines preferred)
- **Export only public APIs**

### Comments

- Use JSDoc for public APIs
- Explain **why**, not **what** (code shows what)
- Add inline comments for complex logic
- Keep comments up-to-date

**Example:**
```typescript
/**
 * Tokenize text into searchable tokens.
 *
 * Converts text to lowercase, strips markdown and punctuation,
 * and splits on whitespace. This enables case-insensitive
 * exact token matching in the search index.
 *
 * @param text - Text to tokenize
 * @returns Array of lowercase alphanumeric tokens
 *
 * @example
 * tokenize("## Section Two")
 * // Returns: ["section", "two"]
 */
export function tokenize(text: string): string[] {
  // Implementation...
}
```

## Testing Requirements

### Test Coverage

- **All new features** must have verification tests
- **Bug fixes** should include regression tests
- **Core logic** should have unit tests (future)

### Running Tests

```bash
# Build first
npm run build

# Run all verification tests
node demo/reader/verify.js
node demo/search/verify.js
node demo/ranking/verify.js

# Run specific test
node demo/ranking/verify.js
```

### Writing Tests

Add tests to appropriate `demo/*/verify.js` files:

```javascript
test('Feature works as expected', () => {
  const result = someFunction()
  if (result !== expectedValue) {
    throw new Error('Result should match expected value')
  }
})
```

### Test Philosophy

- Test behavior, not implementation
- Use real data when possible
- Make tests deterministic
- Keep tests fast (< 1s per file)

## Documentation

### What to Document

- **New APIs** - Add to README.md and relevant demo docs
- **Breaking changes** - Update migration guide
- **Architecture changes** - Update CLAUDE.md
- **Examples** - Add to demo scripts

### Documentation Style

- Use clear, simple language
- Provide code examples
- Explain why, not just how
- Link to related docs
- Keep docs up-to-date with code

### Where to Document

- **README.md** - Installation, quick start, overview
- **CLAUDE.md** - Architecture, development guide
- **demo/README.md** - Demo overview
- **demo/*/README.md** - Feature-specific user docs
- **demo/*/*.md** - Detailed implementation docs
- **docs/*.md** - Technical implementation notes

## Release Process

### For Maintainers

Creating a new release is automated through GitHub Actions:

1. **Update version in package.json:**
   ```bash
   npm version patch  # For bug fixes (1.0.0 -> 1.0.1)
   npm version minor  # For new features (1.0.0 -> 1.1.0)
   npm version major  # For breaking changes (1.0.0 -> 2.0.0)
   ```

2. **Push the version tag:**
   ```bash
   git push origin master --tags
   ```

3. **Automated workflows will:**
   - Build the project
   - Generate changelog from commits since last tag
   - Create a GitHub Release with release notes
   - Automatically publish the package to npm

### Setting Up npm Publishing (First Time Only)

To enable automatic npm publishing, you need to configure an npm token:

1. **Generate an npm token:**
   - Log in to [npmjs.com](https://www.npmjs.com/)
   - Go to Account Settings → Access Tokens
   - Click "Generate New Token" → Choose "Automation" type
   - Copy the generated token

2. **Add token to GitHub:**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

3. **Verify setup:**
   - Create a test release
   - Check the "Publish to npm" workflow runs successfully
   - Verify package appears on npmjs.com

**Commit Message Conventions:**

Use clear prefixes to help generate meaningful changelogs:
- `Add:` - New features
- `Fix:` - Bug fixes
- `Update:` - Enhancements to existing features
- `Refactor:` - Code improvements without behavior changes
- `Docs:` - Documentation updates
- `Test:` - Test additions or updates

## Community

### Getting Help

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - Questions, ideas, general discussion
- **Documentation** - Check [demo/README.md](demo/README.md) first

### Recognition

Contributors will be:
- Listed in release notes
- Credited in commits
- Acknowledged in the community

Thank you for contributing to SRE! 🎉

---

**Questions?** Feel free to ask in [GitHub Discussions](https://github.com/phillt/SRE/discussions) or open an issue.
