import fs from 'fs-extra'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Cache the version to avoid repeated file reads
let cachedVersion: string | null = null

/**
 * Read the version from package.json.
 * Caches the result for performance.
 *
 * @returns The version string from package.json
 */
export async function getVersion(): Promise<string> {
  if (cachedVersion) {
    return cachedVersion
  }

  // Find package.json relative to this file
  // This file will be at dist/utils/read-version.js after compilation
  // package.json is at the project root
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json')

  const packageJson = await fs.readJson(packageJsonPath)
  const version = packageJson.version || '0.0.0'
  cachedVersion = version

  return version
}
