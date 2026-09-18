import type { Node } from '@xyflow/react'

export type DrawElementType = 'freehand' | 'rect' | 'ellipse' | 'triangle' | 'arrow' | 'star'

export type DrawElement = {
  id: string
  type: DrawElementType
  color: string
  x: number
  y: number
  width: number
  height: number
  /** normalized 0..1 within the element's own bounding box — only for freehand */
  points?: { x: number; y: number }[]
}

export type StoryNodeData = {
  label: string
  color: string
  text?: string
  imageUrl?: string
  date?: string
  pinned?: boolean
  elements?: DrawElement[]
}

export type StoryNode = Node<StoryNodeData>

export type BoardMeta = {
  id: string
  name: string
  created_at: string
}
