#!/usr/bin/env node

import { Command } from 'commander'
import { glob, processFile } from './index.js'
import * as fs from 'fs/promises'

const program = new Command()

program
  .name('sre')
  .description('CLI tool to process files')
  .version('1.0.0')
  .argument('<input>', 'Input file or glob pattern')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input: string, options: { output: string; verbose: boolean }) => {
    try {
      if (options.verbose) {
        console.log('Processing with options:', { input, ...options })
      }

      // Resolve glob pattern
      const files = await glob(input, { nodir: true })

      if (files.length === 0) {
        console.error(`No files found matching pattern: ${input}`)
        process.exit(1)
      }

      if (options.verbose) {
        console.log(`Found ${files.length} file(s):`)
        files.forEach((file) => console.log(`  - ${file}`))
      }

      // Ensure output directory exists
      await fs.mkdir(options.output, { recursive: true })

      // Process each file
      for (const file of files) {
        await processFile(file, options.output, { verbose: options.verbose })
      }

      console.log(`Successfully processed ${files.length} file(s) to ${options.output}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
