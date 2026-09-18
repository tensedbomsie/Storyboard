import type { Node } from '@xyflow/react'

export type ShapeKind = 'freehand' | 'rect' | 'ellipse' | 'triangle' | 'arrow' | 'star'

export type StoryNodeData = {
  label: string
  color: string
  text?: string
  imageUrl?: string
  date?: string
  pinned?: boolean
  /** only on `type: 'shape'` nodes — which geometry to draw inside the node box */
  shape?: ShapeKind
  /**
   * normalized 0..1 inside the shape node's own box.
   * freehand: every sampled point. arrow: exactly [start, end].
   */
  points?: { x: number; y: number }[]
}

export type StoryNode = Node<StoryNodeData>

export type BoardMeta = {
  id: string
  name: string
  created_at: string
}
