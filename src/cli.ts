#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs-extra'
import * as path from 'path'
import { readAndNormalizeText } from './text-reader.js'
import { splitIntoParagraphs } from './paragraph-splitter.js'

const program = new Command()

program
  .name('sre')
  .description('CLI tool to process text files into paragraph spans')
  .version('1.0.0')
  .argument('<input>', 'Input file')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input: string, options: { output: string; verbose: boolean }) => {
    try {
      if (options.verbose) {
        console.log('Processing file:', input)
      }

      // Check if input file exists
      const fileExists = await fs.pathExists(input)
      if (!fileExists) {
        console.error(`File not found: ${input}`)
        process.exit(1)
      }

      // Read and normalize text
      const { text, sourceHash } = await readAndNormalizeText(input)

      if (options.verbose) {
        console.log('Source hash:', sourceHash)
        console.log('Normalized text length:', text.length)
      }

      // Split into paragraph spans
      const spans = splitIntoParagraphs(text)

      if (spans.length === 0) {
        console.error('No paragraphs found in input file')
        process.exit(1)
      }

      // Ensure output directory exists
      await fs.ensureDir(options.output)

      // Write spans to JSONL (one JSON object per line)
      const outputPath = path.join(options.output, 'spans.jsonl')
      const lines = spans.map((span) => JSON.stringify(span)).join('\n')
      await fs.writeFile(outputPath, lines + '\n', 'utf-8')

      // Print summary
      console.log(`Processed ${spans.length} span(s) → ${outputPath}`)

      process.exit(0)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
