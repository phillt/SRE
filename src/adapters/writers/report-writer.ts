import fs from 'fs-extra'
import * as path from 'path'
import { BuildReport, BuildReportSchema } from '../../core/contracts/report.js'

/**
 * Write a build quality report to the output directory.
 * The report is pretty-printed with 2-space indentation for readability.
 *
 * @param report - The build report to write
 * @param outputDir - Directory to write the report to
 * @param filename - Name of the report file (default: 'buildReport.json')
 * @returns The absolute path to the written report file
 */
export async function writeReport(
  report: BuildReport,
  outputDir: string,
  filename: string = 'buildReport.json'
): Promise<string> {
  // Validate report with Zod schema
  BuildReportSchema.parse(report)

  // Ensure output directory exists
  await fs.ensureDir(outputDir)

  // Write report as pretty-printed JSON
  const outputPath = path.join(outputDir, filename)
  await fs.writeJson(outputPath, report, { spaces: 2 })

  return outputPath
}
