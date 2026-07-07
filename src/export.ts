import type { Edge } from '@xyflow/react'
import type { StoryNode } from './types'

const typeLabel: Record<string, string> = {
  text: 'ไอเดีย',
  image: 'รูปภาพ',
  timeline: 'เหตุการณ์',
}

export function buildExportText(boardName: string, nodes: StoryNode[], edges: Edge[]) {
  const lines: string[] = [`# Storyboard: ${boardName}`, '']

  lines.push('## Nodes')
  for (const node of nodes) {
    const kind = typeLabel[node.type ?? ''] ?? node.type
    lines.push(`- [${kind}] "${node.data.label}"${node.data.date ? ` (${node.data.date})` : ''}`)
    if (node.data.text) lines.push(`  ${node.data.text.replace(/\n/g, '\n  ')}`)
    if (node.data.imageUrl) lines.push(`  (รูป: ${node.data.imageUrl})`)
  }

  if (edges.length > 0) {
    lines.push('', '## Connections')
    const labelOf = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id
    for (const edge of edges) {
      const arrow = edge.label ? `→ (${edge.label}) →` : '→'
      lines.push(`- "${labelOf(edge.source)}" ${arrow} "${labelOf(edge.target)}"`)
    }
  }

  return lines.join('\n')
}
