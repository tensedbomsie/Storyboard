import type { Edge } from '@xyflow/react'
import type { ShapeKind, StoryNode, StoryNodeData } from './types'

export type Pt = { x: number; y: number }

/** every tool the floating draw toolbar offers */
export type Tool = 'select' | 'eraser' | ShapeKind

export const TOOLS: { id: Tool; icon: string; title: string }[] = [
  { id: 'select', icon: '↖', title: 'เลือก / ย้าย / ปรับขนาด (Esc)' },
  { id: 'freehand', icon: '✏️', title: 'ปากกา — วาดอิสระ' },
  { id: 'rect', icon: '▭', title: 'สี่เหลี่ยม' },
  { id: 'ellipse', icon: '◯', title: 'วงกลม / วงรี' },
  { id: 'triangle', icon: '△', title: 'สามเหลี่ยม' },
  { id: 'arrow', icon: '↗', title: 'ลูกศร (ลากจากต้นทางไปปลายทาง)' },
  { id: 'star', icon: '★', title: 'ดาว' },
  { id: 'eraser', icon: '🧽', title: 'ยางลบ — ลากทับรูปทรงเพื่อลบ (ไม่ลบการ์ดไอเดีย)' },
]

/** the tool ids that actually draw something */
export function drawKindOf(tool: Tool): ShapeKind | null {
  return tool === 'select' || tool === 'eraser' ? null : tool
}

/**
 * Half-width of the eraser tip, in *flow* units. The pointer erases any shape
 * whose stroke falls inside this radius, so a fast drag still rubs things out.
 */
export const ERASER_RADIUS = 9

const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

/** do segments p1-p2 and p3-p4 properly cross each other? */
function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

/** squared distance from point p to the segment a-b */
function distToSegmentSq(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx - p.x
  const cy = a.y + t * dy - p.y
  return cx * cx + cy * cy
}

/**
 * The outline of a shape as a list of segments, in flow coordinates.
 * Used by the eraser so it rubs out what you visually touch (the stroke),
 * not just anything whose bounding box happens to contain the pointer.
 */
function outlineSegments(node: StoryNode): [Pt, Pt][] {
  const { x, y } = node.position
  const w = node.width ?? MIN_SHAPE
  const h = node.height ?? MIN_SHAPE
  const at = (px: number, py: number) => ({ x: x + px, y: y + py })
  const chain = (pts: Pt[], close: boolean): [Pt, Pt][] => {
    const segs: [Pt, Pt][] = []
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]])
    if (close && pts.length > 1) segs.push([pts[pts.length - 1], pts[0]])
    return segs
  }

  switch (node.data.shape) {
    case 'freehand':
      return chain((node.data.points ?? []).map((p) => at(p.x * w, p.y * h)), false)
    case 'arrow': {
      const a = node.data.points?.[0] ?? { x: 0, y: 0 }
      const b = node.data.points?.[1] ?? { x: 1, y: 1 }
      return [[at(a.x * w, a.y * h), at(b.x * w, b.y * h)]]
    }
    case 'triangle':
      return chain([at(w / 2, 0), at(0, h), at(w, h)], true)
    case 'star':
      return chain(
        starPoints(w, h)
          .split(' ')
          .map((pair) => {
            const [px, py] = pair.split(',').map(Number)
            return at(px, py)
          }),
        true,
      )
    case 'ellipse': {
      const pts: Pt[] = []
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24
        pts.push(at(w / 2 + (w / 2) * Math.cos(angle), h / 2 + (h / 2) * Math.sin(angle)))
      }
      return chain(pts, true)
    }
    default: // rect
      return chain([at(0, 0), at(w, 0), at(w, h), at(0, h)], true)
  }
}

/** does the eraser tip, dragged from `from` to `to`, touch this shape's outline? */
export function eraserTouchesShape(node: StoryNode, from: Pt, to: Pt) {
  if (node.type !== 'shape') return false
  const w = node.width ?? MIN_SHAPE
  const h = node.height ?? MIN_SHAPE
  // cheap reject: eraser path nowhere near the shape's box
  const pad = ERASER_RADIUS
  const minX = Math.min(from.x, to.x) - pad
  const maxX = Math.max(from.x, to.x) + pad
  const minY = Math.min(from.y, to.y) - pad
  const maxY = Math.max(from.y, to.y) + pad
  if (maxX < node.position.x || minX > node.position.x + w) return false
  if (maxY < node.position.y || minY > node.position.y + h) return false

  const rSq = ERASER_RADIUS * ERASER_RADIUS
  for (const [a, b] of outlineSegments(node)) {
    // the eraser's travel and the outline segment either cross outright, or
    // their closest approach is at one of the four endpoints — so a fast drag
    // across a thin line still registers instead of jumping over it
    if (segmentsIntersect(from, to, a, b)) return true
    if (distToSegmentSq(a, from, to) <= rSq) return true
    if (distToSegmentSq(b, from, to) <= rSq) return true
    if (distToSegmentSq(from, a, b) <= rSq) return true
    if (distToSegmentSq(to, a, b) <= rSq) return true
  }
  return false
}

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
