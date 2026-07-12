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

export type BackupPayload = {
  format: 'storyboard-backup'
  version: 1
  boardName: string
  nodes: StoryNode[]
  edges: Edge[]
}

export function buildBackupText(boardName: string, nodes: StoryNode[], edges: Edge[]) {
  const payload: BackupPayload = { format: 'storyboard-backup', version: 1, boardName, nodes, edges }
  return JSON.stringify(payload, null, 2)
}

export function parseBackupText(text: string): { nodes: StoryNode[]; edges: Edge[] } {
  const parsed = JSON.parse(text)
  if (parsed?.format !== 'storyboard-backup' || !Array.isArray(parsed.nodes)) {
    throw new Error('invalid backup format')
  }
  return { nodes: parsed.nodes, edges: Array.isArray(parsed.edges) ? parsed.edges : [] }
}
