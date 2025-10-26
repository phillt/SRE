#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs-extra'
import { spanize } from '../pipeline/spanize.js'

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
      // Check if input file exists
      const fileExists = await fs.pathExists(input)
      if (!fileExists) {
        console.error(`File not found: ${input}`)
        process.exit(1)
      }

      if (options.verbose) {
        console.log('Processing file:', input)
      }

      // Run the spanize pipeline
      const result = await spanize(input, options.output, {
        verbose: options.verbose,
      })

      // Print summary
      console.log(`Processed ${result.spans.length} span(s) → ${result.outputPath}`)

      process.exit(0)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
