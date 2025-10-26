import fs from 'fs-extra'
import * as path from 'path'
import { Manifest, ManifestSchema } from '../../core/contracts/manifest.js'

/**
 * Write a manifest JSON file to the output directory.
 * The manifest is pretty-printed with 2-space indentation for readability.
 *
 * @param manifest - The manifest data to write
 * @param outputDir - Directory to write the manifest to
 * @param filename - Name of the manifest file (default: 'manifest.json')
 * @returns The absolute path to the written manifest file
 */
export async function writeManifest(
  manifest: Manifest,
  outputDir: string,
  filename: string = 'manifest.json'
): Promise<string> {
  // Validate manifest with Zod schema
  ManifestSchema.parse(manifest)

  // Ensure output directory exists
  await fs.ensureDir(outputDir)

  // Write manifest as pretty-printed JSON
  const outputPath = path.join(outputDir, filename)
  await fs.writeJson(outputPath, manifest, { spaces: 2 })

  return outputPath
}
