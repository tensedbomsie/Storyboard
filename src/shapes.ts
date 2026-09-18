import type { Edge } from '@xyflow/react'
import type { ShapeKind, StoryNode, StoryNodeData } from './types'

export type Pt = { x: number; y: number }

/** every tool the floating draw toolbar offers */
export type Tool = 'select' | ShapeKind

export const TOOLS: { id: Tool; icon: string; title: string }[] = [
  { id: 'select', icon: '↖', title: 'เลือก / ย้าย / ปรับขนาด (Esc)' },
  { id: 'freehand', icon: '✏️', title: 'ปากกา — วาดอิสระ' },
  { id: 'rect', icon: '▭', title: 'สี่เหลี่ยม' },
  { id: 'ellipse', icon: '◯', title: 'วงกลม / วงรี' },
  { id: 'triangle', icon: '△', title: 'สามเหลี่ยม' },
  { id: 'arrow', icon: '↗', title: 'ลูกศร (ลากจากต้นทางไปปลายทาง)' },
  { id: 'star', icon: '★', title: 'ดาว' },
]

/** smallest width/height a shape node may have (also the resizer minimum) */
export const MIN_SHAPE = 10

/** thickness of the invisible "grab me" stroke drawn around every shape */
export const HIT_STROKE = 18

export const SHAPE_STROKE = 3

export const SHAPE_LABEL: Record<ShapeKind, string> = {
  freehand: 'เส้นวาดอิสระ',
  rect: 'สี่เหลี่ยม',
  ellipse: 'วงรี',
  triangle: 'สามเหลี่ยม',
  arrow: 'ลูกศร',
  star: 'ดาว',
}

export function starPoints(width: number, height: number) {
  const cx = width / 2
  const cy = height / 2
  const inner = 0.42
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const k = i % 2 === 0 ? 1 : inner
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${cx + (width / 2) * k * Math.cos(angle)},${cy + (height / 2) * k * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

/** points are normalized 0..1 inside the shape's own bounding box */
export function freehandPath(points: Pt[], width: number, height: number) {
  if (points.length === 0) return ''
  return `M ${points.map((p) => `${p.x * width},${p.y * height}`).join(' L ')}`
}

export function boundingBox(points: Pt[]) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    minX,
    minY,
    rawWidth: maxX - minX,
    rawHeight: maxY - minY,
    width: Math.max(maxX - minX, MIN_SHAPE),
    height: Math.max(maxY - minY, MIN_SHAPE),
  }
}

/**
 * Turns a raw gesture (points in *flow* coordinates) into a free-floating shape node.
 * Returns null when the gesture was too small to be a real shape (a stray click).
 */
export function buildShapeNode(kind: ShapeKind, flowPoints: Pt[], color: string): StoryNode | null {
  if (flowPoints.length < 2) return null
  const box = boundingBox(flowPoints)
  if (box.rawWidth < 4 && box.rawHeight < 4) return null

  const norm = (p: Pt) => ({
    x: (p.x - box.minX) / box.width,
    y: (p.y - box.minY) / box.height,
  })

  const data: StoryNodeData = { label: SHAPE_LABEL[kind], color, shape: kind }
  if (kind === 'freehand') {
    data.points = flowPoints.map(norm)
  } else if (kind === 'arrow') {
    data.points = [norm(flowPoints[0]), norm(flowPoints[flowPoints.length - 1])]
  }

  return {
    id: crypto.randomUUID(),
    type: 'shape',
    position: { x: box.minX, y: box.minY },
    width: box.width,
    height: box.height,
    data,
  }
}

/** shape of the elements the old, node-scoped `draw` node used to store */
type LegacyDrawElement = {
  type: ShapeKind
  color: string
  x: number
  y: number
  width: number
  height: number
  points?: Pt[]
}

/** where the old draw node's inner SVG started, relative to the node's own box */
const LEGACY_CANVAS_OFFSET = { x: 2, y: 62 }

/**
 * Boards saved before shapes became first-class canvas objects contain
 * `type: 'draw'` nodes with an `elements` array inside them. Unpack each of
 * those elements into its own free-floating shape node so nothing is lost and
 * no board is left holding a node type that no longer exists.
 */
export function migrateLegacyDrawNodes(nodes: StoryNode[], edges: Edge[]) {
  if (!nodes.some((n) => n.type === 'draw')) return { nodes, edges }

  const removed = new Set<string>()
  const migrated: StoryNode[] = []

  for (const node of nodes) {
    if (node.type !== 'draw') {
      migrated.push(node)
      continue
    }
    removed.add(node.id)
    const elements = (node.data as { elements?: LegacyDrawElement[] }).elements ?? []
    for (const el of elements) {
      migrated.push({
        id: crypto.randomUUID(),
        type: 'shape',
        position: {
          x: node.position.x + LEGACY_CANVAS_OFFSET.x + el.x,
          y: node.position.y + LEGACY_CANVAS_OFFSET.y + el.y,
        },
        width: Math.max(el.width, MIN_SHAPE),
        height: Math.max(el.height, MIN_SHAPE),
        data: {
          label: SHAPE_LABEL[el.type] ?? 'รูปทรง',
          color: el.color,
          shape: el.type,
          ...(el.points ? { points: el.points } : {}),
        },
      })
    }
  }

  return {
    nodes: migrated,
    edges: edges.filter((e) => !removed.has(e.source) && !removed.has(e.target)),
  }
}
