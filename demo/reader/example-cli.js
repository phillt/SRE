#!/usr/bin/env node

/**
 * Example CLI query tool built on Reader API
 *
 * Usage:
 *   node example-cli.js <output-dir> info
 *   node example-cli.js <output-dir> span <id>
 *   node example-cli.js <output-dir> order <n>
 *   node example-cli.js <output-dir> context <id> [before] [after]
 *   node example-cli.js <output-dir> sections
 *   node example-cli.js <output-dir> section <id>
 */

import { createReader } from '../../dist/runtime/api/index.js'

const [, , outputDir, command, ...args] = process.argv

if (!outputDir || !command) {
  console.error('Usage: node example-cli.js <output-dir> <command> [args...]')
  console.error('\nCommands:')
  console.error('  info                       Show document info')
  console.error('  span <id>                  Get span by ID')
  console.error('  order <n>                  Get span by order')
  console.error('  context <id> [B] [A]       Get context (default: before=1, after=1)')
  console.error('  sections                   List all sections')
  console.error('  section <id>               Get section details')
  process.exit(1)
}

async function main() {
  // Load artifacts
  const reader = await createReader(outputDir)

  // Route command
  switch (command) {
    case 'info': {
      const manifest = reader.getManifest()
      console.log(JSON.stringify(manifest, null, 2))
      break
    }

    case 'span': {
      const [id] = args
      if (!id) {
        console.error('Error: span ID required')
        process.exit(1)
      }
      const span = reader.getSpan(id)
      if (!span) {
        console.error(`Error: span not found: ${id}`)
        process.exit(1)
      }
      console.log(JSON.stringify(span, null, 2))
      break
    }

    case 'order': {
      const [orderStr] = args
      if (!orderStr) {
        console.error('Error: order number required')
        process.exit(1)
      }
      const order = parseInt(orderStr, 10)
      if (isNaN(order)) {
        console.error('Error: order must be a number')
        process.exit(1)
      }
      const span = reader.getByOrder(order)
      if (!span) {
        console.error(`Error: no span at order ${order}`)
        process.exit(1)
      }
      console.log(JSON.stringify(span, null, 2))
      break
    }

    case 'context': {
      const [id, beforeStr = '1', afterStr = '1'] = args
      if (!id) {
        console.error('Error: span ID required')
        process.exit(1)
      }
      const before = parseInt(beforeStr, 10)
      const after = parseInt(afterStr, 10)

      const contextIds = reader.neighbors(id, { before, after })
      if (contextIds.length === 0) {
        console.error(`Error: span not found: ${id}`)
        process.exit(1)
      }

      const context = contextIds.map((spanId) => {
        const span = reader.getSpan(spanId)
        return {
          ...span,
          isTarget: spanId === id,
        }
      })
      console.log(JSON.stringify(context, null, 2))
      break
    }

    case 'sections': {
      const sections = reader.listSections()
      const nodeMap = reader.getNodeMap()

      const sectionData = sections.map((sectionId) => {
        const section = reader.getSection(sectionId)
        const meta = nodeMap?.sections[sectionId]?.meta
        return {
          id: sectionId,
          heading: meta?.heading || '',
          paragraphCount: section.paragraphIds.length,
          paragraphIds: section.paragraphIds,
        }
      })
      console.log(JSON.stringify(sectionData, null, 2))
      break
    }

    case 'section': {
      const [sectionId] = args
      if (!sectionId) {
        console.error('Error: section ID required')
        process.exit(1)
      }
      const section = reader.getSection(sectionId)
      if (!section) {
        console.error(`Error: section not found: ${sectionId}`)
        process.exit(1)
      }

      const nodeMap = reader.getNodeMap()
      const meta = nodeMap?.sections[sectionId]?.meta

      const spans = section.paragraphIds.map((spanId) => reader.getSpan(spanId))

      console.log(
        JSON.stringify(
          {
            id: sectionId,
            heading: meta?.heading || '',
            paragraphCount: spans.length,
            spans,
          },
          null,
          2
        )
      )
      break
    }

    default:
      console.error(`Error: unknown command: ${command}`)
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
