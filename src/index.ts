import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Process a single file and write to output directory
 */
export async function processFile(
  inputPath: string,
  outputDir: string,
  options: { verbose?: boolean } = {}
): Promise<void> {
  if (options.verbose) {
    console.log(`Processing: ${inputPath}`)
  }

  // Read the input file
  const content = await fs.readFile(inputPath, 'utf-8')

  // TODO: Add your custom processing logic here
  // For now, we'll just copy the file with a processed prefix
  const processedContent = `// Processed by SRE\n${content}`

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true })

  // Determine output path (preserve filename)
  const fileName = path.basename(inputPath)
  const outputPath = path.join(outputDir, fileName)

  // Write to output directory
  await fs.writeFile(outputPath, processedContent, 'utf-8')

  if (options.verbose) {
    console.log(`  → ${outputPath}`)
  }
}

export { glob } from 'glob'
