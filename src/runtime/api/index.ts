import { loadArtifacts } from '../loader/load-artifacts.js'
import { Reader } from './Reader.js'

/**
 * Convenience function to load artifacts and create a Reader in one step.
 *
 * @param outputDir - Path to the output directory containing artifacts
 * @returns A configured Reader instance
 * @throws Error if required files are missing or invalid
 */
export async function createReader(outputDir: string): Promise<Reader> {
  const artifacts = await loadArtifacts(outputDir)
  return new Reader(artifacts)
}

// Re-export types and classes
export { Reader } from './Reader.js'
export type { NeighborsOptions } from './Reader.js'
export { loadArtifacts } from '../loader/load-artifacts.js'
export type { LoadedArtifacts } from '../loader/load-artifacts.js'
