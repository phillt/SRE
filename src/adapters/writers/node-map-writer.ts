import { promises as fs } from 'fs'
import path from 'path'
import { NodeMap, NodeMapSchema } from '../../core/contracts/node-map.js'

/**
 * Write node map to nodeMap.json file.
 * Validates with Zod before writing.
 *
 * @param nodeMap - The node map to write
 * @param outputDir - Directory to write the file to
 * @returns Path to the written file
 */
export async function writeNodeMap(
  nodeMap: NodeMap,
  outputDir: string
): Promise<string> {
  // Validate with Zod
  NodeMapSchema.parse(nodeMap)

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true })

  // Write formatted JSON
  const outputPath = path.join(outputDir, 'nodeMap.json')
  await fs.writeFile(outputPath, JSON.stringify(nodeMap, null, 2), 'utf-8')

  return outputPath
}
