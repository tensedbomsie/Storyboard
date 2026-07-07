import type { Node } from '@xyflow/react'

export type StoryNodeData = {
  label: string
  color: string
  text?: string
  imageUrl?: string
}

export type StoryNode = Node<StoryNodeData>
