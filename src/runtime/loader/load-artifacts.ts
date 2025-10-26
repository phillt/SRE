import { promises as fs } from 'fs'
import path from 'path'
import { Manifest, ManifestSchema } from '../../core/contracts/manifest.js'
import { Span, SpanSchema } from '../../core/contracts/span.js'
import { NodeMap, NodeMapSchema } from '../../core/contracts/node-map.js'
import { BuildReport, BuildReportSchema } from '../../core/contracts/report.js'

/**
 * Loaded artifacts from an output directory
 */
export interface LoadedArtifacts {
  manifest: Manifest
  spans: Span[]
  nodeMap?: NodeMap
  buildReport?: BuildReport
}

/**
 * Load all artifacts from an output directory.
 *
 * Required files:
 * - manifest.json
 * - spans.jsonl
 *
 * Optional files:
 * - nodeMap.json
 * - buildReport.json
 *
 * @param outputDir - Path to the output directory
 * @returns Loaded and validated artifacts
 * @throws Error if required files are missing or invalid
 */
export async function loadArtifacts(outputDir: string): Promise<LoadedArtifacts> {
  // Check if directory exists
  try {
    const stats = await fs.stat(outputDir)
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${outputDir}`)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Directory not found: ${outputDir}`)
    }
    throw error
  }

  // Load manifest.json (required)
  const manifestPath = path.join(outputDir, 'manifest.json')
  let manifest: Manifest
  try {
    const manifestData = await fs.readFile(manifestPath, 'utf-8')
    const manifestJson = JSON.parse(manifestData)
    manifest = ManifestSchema.parse(manifestJson)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`manifest.json not found in ${outputDir}`)
    }
    throw new Error(`Failed to load manifest.json: ${(error as Error).message}`)
  }

  // Load spans.jsonl (required)
  const spansPath = path.join(outputDir, 'spans.jsonl')
  let spans: Span[]
  try {
    const spansData = await fs.readFile(spansPath, 'utf-8')
    const lines = spansData.trim().split('\n')
    spans = lines.map((line, index) => {
      try {
        const spanJson = JSON.parse(line)
        return SpanSchema.parse(spanJson)
      } catch (error) {
        throw new Error(`Invalid span at line ${index + 1}: ${(error as Error).message}`)
      }
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`spans.jsonl not found in ${outputDir}`)
    }
    throw new Error(`Failed to load spans.jsonl: ${(error as Error).message}`)
  }

  // Load nodeMap.json (optional)
  const nodeMapPath = path.join(outputDir, 'nodeMap.json')
  let nodeMap: NodeMap | undefined
  try {
    const nodeMapData = await fs.readFile(nodeMapPath, 'utf-8')
    const nodeMapJson = JSON.parse(nodeMapData)
    nodeMap = NodeMapSchema.parse(nodeMapJson)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // File exists but failed to parse - this is an error
      throw new Error(`Failed to load nodeMap.json: ${(error as Error).message}`)
    }
    // File doesn't exist - that's OK, it's optional
  }

  // Load buildReport.json (optional)
  const buildReportPath = path.join(outputDir, 'buildReport.json')
  let buildReport: BuildReport | undefined
  try {
    const buildReportData = await fs.readFile(buildReportPath, 'utf-8')
    const buildReportJson = JSON.parse(buildReportData)
    buildReport = BuildReportSchema.parse(buildReportJson)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // File exists but failed to parse - this is an error
      throw new Error(`Failed to load buildReport.json: ${(error as Error).message}`)
    }
    // File doesn't exist - that's OK, it's optional
  }

  return {
    manifest,
    spans,
    nodeMap,
    buildReport,
  }
}
