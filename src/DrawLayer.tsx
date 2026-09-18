import { useEffect, useRef, useState } from 'react'
import { Panel, useReactFlow } from '@xyflow/react'
import type { StoryNode } from './types'
import { SHAPE_STROKE, TOOLS, boundingBox, buildShapeNode, type Pt, type Tool } from './shapes'
import { ArrowMarker, ShapeGeometry } from './ShapeGeometry'

/** FigJam-style floating toolbar pinned over the canvas (never pans/zooms). */
export function DrawToolbar({
  tool,
  setTool,
  color,
  setColor,
  selectedShapeCount,
  onDeleteSelected,
}: {
  tool: Tool
  setTool: (t: Tool) => void
  color: string
  setColor: (c: string) => void
  selectedShapeCount: number
  onDeleteSelected: () => void
}) {
  return (
    <Panel position="top-left" className="draw-panel">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`draw-tool-btn${tool === t.id ? ' active' : ''}`}
          title={t.title}
          onClick={() => setTool(t.id)}
        >
          {t.icon}
        </button>
      ))}
      <input
        type="color"
        className="draw-panel-color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        title="สีของรูปทรง (ถ้าเลือกรูปทรงอยู่ จะเปลี่ยนสีให้ด้วย)"
      />
      <button
        type="button"
        className="draw-tool-btn draw-delete-btn"
        title="ลบรูปทรงที่เลือก (Delete)"
        disabled={selectedShapeCount === 0}
        onClick={onDeleteSelected}
      >
        🗑{selectedShapeCount > 1 ? ` ${selectedShapeCount}` : ''}
      </button>
    </Panel>
  )
}

type Gesture = { screen: Pt[]; flow: Pt[] }

/**
 * Turns pointer gestures on the open canvas into new shape nodes.
 *
 * Renders as a `pointer-events: none` overlay (it only draws the live preview);
 * the actual input is grabbed with a capture-phase `pointerdown` listener on the
 * React Flow container, so React Flow never starts a pan/box-select while a
 * drawing tool is active — but wheel-zoom keeps working untouched.
 *
 * Every coordinate that ends up stored goes through `screenToFlowPosition`, so
 * shapes land exactly under the cursor at any pan/zoom level.
 */
export function DrawCaptureLayer({
  tool,
  color,
  onCreate,
}: {
  tool: Tool
  color: string
  onCreate: (node: StoryNode) => void
}) {
  const { screenToFlowPosition } = useReactFlow()
  const layerRef = useRef<HTMLDivElement>(null)
  const [gesture, setGesture] = useState<Gesture | null>(null)

  const toolRef = useRef(tool)
  toolRef.current = tool
  const colorRef = useRef(color)
  colorRef.current = color
  const gestureRef = useRef<Gesture | null>(null)
  const s2f = useRef(screenToFlowPosition)
  s2f.current = screenToFlowPosition
  const onCreateRef = useRef(onCreate)
  onCreateRef.current = onCreate

  useEffect(() => {
    const container = layerRef.current?.parentElement
    if (!container) return

    const sample = (e: PointerEvent): { screen: Pt; flow: Pt } => {
      const rect = container.getBoundingClientRect()
      return {
        screen: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        flow: s2f.current({ x: e.clientX, y: e.clientY }),
      }
    }

    const push = (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g) return
      const p = sample(e)
      if (toolRef.current === 'freehand') {
        g.screen.push(p.screen)
        g.flow.push(p.flow)
      } else {
        // every other tool only needs the two corners of the drag
        g.screen[1] = p.screen
        g.flow[1] = p.flow
      }
      const next = { screen: [...g.screen], flow: [...g.flow] }
      gestureRef.current = next
      setGesture(next)
    }

    const onMove = (e: PointerEvent) => push(e)

    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const g = gestureRef.current
      gestureRef.current = null
      setGesture(null)
      if (!g) return
      const p = sample(e)
      const flow = toolRef.current === 'freehand' ? [...g.flow, p.flow] : [g.flow[0], p.flow]
      const kind = toolRef.current
      if (kind === 'select') return
      const node = buildShapeNode(kind, flow, colorRef.current)
      if (node) onCreateRef.current(node)
    }

    const onDown = (e: PointerEvent) => {
      if (toolRef.current === 'select' || e.button !== 0) return
      const target = e.target as HTMLElement | null
      // let the floating toolbar / controls / minimap keep working
      if (target?.closest('.react-flow__panel')) return
      e.preventDefault()
      e.stopPropagation()
      const p = sample(e)
      const start: Gesture = { screen: [p.screen, p.screen], flow: [p.flow, p.flow] }
      gestureRef.current = start
      setGesture(start)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    container.addEventListener('pointerdown', onDown, true)
    return () => {
      container.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // preview is drawn in plain screen pixels, so it always sits under the cursor
  let preview = null
  if (gesture && tool !== 'select' && gesture.screen.length >= 2) {
    const box = boundingBox(gesture.screen)
    const norm = (p: Pt) => ({
      x: (p.x - box.minX) / box.width,
      y: (p.y - box.minY) / box.height,
    })
    const points =
      tool === 'freehand'
        ? gesture.screen.map(norm)
        : tool === 'arrow'
          ? [norm(gesture.screen[0]), norm(gesture.screen[gesture.screen.length - 1])]
          : undefined
    preview = (
      <svg className="draw-preview-svg">
        {tool === 'arrow' && <ArrowMarker id="sb-arrow-preview" color={color} />}
        <g transform={`translate(${box.minX},${box.minY})`}>
          <ShapeGeometry
            kind={tool}
            width={box.width}
            height={box.height}
            points={points}
            stroke={color}
            strokeWidth={SHAPE_STROKE}
            markerId={tool === 'arrow' ? 'sb-arrow-preview' : undefined}
            opacity={0.75}
          />
        </g>
      </svg>
    )
  }

  return (
    <div ref={layerRef} className="draw-capture-layer">
      {preview}
    </div>
  )
}
