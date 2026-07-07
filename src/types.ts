import type { Node } from '@xyflow/react'

export type StoryNodeData = {
  label: string
  color: string
  text?: string
  imageUrl?: string
  date?: string
}

export type StoryNode = Node<StoryNodeData>

export type BoardMeta = {
  id: string
  name: string
  created_at: string
}
