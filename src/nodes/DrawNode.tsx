import { useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import type { StoryNode, DrawElement, DrawElementType } from '../types'
import { useStoryNode } from './useStoryNode'
import { useCursorPreserve } from './useCursorPreserve'

type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'triangle' | 'arrow' | 'star'

const TOOLS: { id: Tool; icon: string; title: string }[] = [
  { id: 'select', icon: '↖', title: 'เลือก / ย้าย / ปรับขนาด' },
  { id: 'pen', icon: '✏️', title: 'วาดอิสระ' },
  { id: 'rect', icon: '▭', title: 'สี่เหลี่ยม' },
  { id: 'ellipse', icon: '◯', title: 'วงกลม / วงรี' },
  { id: 'triangle', icon: '△', title: 'สามเหลี่ยม' },
  { id: 'arrow', icon: '↗', title: 'ลูกศร' },
  { id: 'star', icon: '★', title: 'ดาว' },
]

const RESIZE_HANDLES = ['nw', 'ne', 'sw', 'se'] as const

function starPoints(width: number, height: number) {
  const cx = width / 2
  const cy = height / 2
  const outerR = Math.min(width, height) / 2
  const innerR = outerR * 0.42
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

function freehandPath(points: { x: number; y: number }[], width: number, height: number) {
  if (points.length === 0) return ''
  return `M ${points.map((p) => `${p.x * width},${p.y * height}`).join(' L ')}`
}

type DragState =
  | { mode: 'draw'; rawPoints: { x: number; y: number }[] }
  | { mode: 'move'; elId: string; startX: number; startY: number; origin: { x: number; y: number } }
  | {
      mode: 'resize'
      elId: string
      handle: string
      startX: number
      startY: number
      origin: { x: number; y: number; width: number; height: number }
    }

export default function DrawNode({ id, data, selected }: NodeProps<StoryNode>) {
  const { update, togglePin, sendToAnotherBoard, duplicate } = useStoryNode(id)
  const title = useCursorPreserve<HTMLInputElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedElId, setSelectedElId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const elementsRef = useRef<DrawElement[]>(data.elements ?? [])
  elementsRef.current = data.elements ?? []

  const elements = data.elements ?? []

  const pointFromClient = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const commit = (next: DrawElement[]) => update({ elements: next })

  const finishDrawing = (rawPoints: { x: number; y: number }[]) => {
    if (rawPoints.length < 2) return
    const xs = rawPoints.map((p) => p.x)
    const ys = rawPoints.map((p) => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    const width = Math.max(maxX - minX, 6)
    const height = Math.max(maxY - minY, 6)
    if (tool === 'pen') {
      const points = rawPoints.map((p) => ({
        x: (p.x - minX) / width,
        y: (p.y - minY) / height,
      }))
      const el: DrawElement = {
        id: crypto.randomUUID(),
        type: 'freehand',
        color: data.color,
        x: minX,
        y: minY,
        width,
        height,
        points,
      }
      commit([...elementsRef.current, el])
    } else if (maxX - minX > 4 || maxY - minY > 4) {
      const el: DrawElement = {
        id: crypto.randomUUID(),
        type: tool as DrawElementType,
        color: data.color,
        x: minX,
        y: minY,
        width,
        height,
      }
      commit([...elementsRef.current, el])
    }
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const p = pointFromClient(e.clientX, e.clientY)
      const d = dragRef.current
      if (!d) return
      if (d.mode === 'draw') {
        d.rawPoints.push(p)
        setDrag({ ...d, rawPoints: [...d.rawPoints] })
      } else if (d.mode === 'move') {
        const dx = p.x - d.startX
        const dy = p.y - d.startY
        commit(
          elementsRef.current.map((el) =>
            el.id === d.elId ? { ...el, x: d.origin.x + dx, y: d.origin.y + dy } : el,
          ),
        )
      } else if (d.mode === 'resize') {
        const dx = p.x - d.startX
        const dy = p.y - d.startY
        const o = d.origin
        let x = o.x
        let y = o.y
        let width = o.width
        let height = o.height
        if (d.handle.includes('e')) width = Math.max(12, o.width + dx)
        if (d.handle.includes('s')) height = Math.max(12, o.height + dy)
        if (d.handle.includes('w')) {
          width = Math.max(12, o.width - dx)
          x = o.x + o.width - width
        }
        if (d.handle.includes('n')) {
          height = Math.max(12, o.height - dy)
          y = o.y + o.height - height
        }
        commit(elementsRef.current.map((el) => (el.id === d.elId ? { ...el, x, y, width, height } : el)))
      }
    }
    const onUp = () => {
      const d = dragRef.current
      if (d?.mode === 'draw') finishDrawing(d.rawPoints)
      dragRef.current = null
      setDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') {
      if (e.target === svgRef.current) setSelectedElId(null)
      return
    }
    e.stopPropagation()
    const p = pointFromClient(e.clientX, e.clientY)
    const state: DragState = { mode: 'draw', rawPoints: [p] }
    dragRef.current = state
    setDrag(state)
  }

  const startMove = (e: React.MouseEvent, el: DrawElement) => {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelectedElId(el.id)
    const p = pointFromClient(e.clientX, e.clientY)
    const state: DragState = { mode: 'move', elId: el.id, startX: p.x, startY: p.y, origin: { x: el.x, y: el.y } }
    dragRef.current = state
    setDrag(state)
  }

  const startResize = (e: React.MouseEvent, el: DrawElement, handle: string) => {
    e.stopPropagation()
    const p = pointFromClient(e.clientX, e.clientY)
    const state: DragState = {
      mode: 'resize',
      elId: el.id,
      handle,
      startX: p.x,
      startY: p.y,
      origin: { x: el.x, y: el.y, width: el.width, height: el.height },
    }
    dragRef.current = state
    setDrag(state)
  }

  const deleteSelected = () => {
    if (!selectedElId) return
    commit(elements.filter((el) => el.id !== selectedElId))
    setSelectedElId(null)
  }

  const clearAll = () => {
    if (elements.length === 0) return
    if (!window.confirm('ล้างภาพวาดทั้งหมดในโหนดนี้?')) return
    commit([])
    setSelectedElId(null)
  }

  const renderShape = (el: DrawElement) => {
    switch (el.type) {
      case 'freehand':
        return (
          <path
            d={freehandPath(el.points ?? [], el.width, el.height)}
            stroke={el.color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      case 'rect':
        return <rect x={0} y={0} width={el.width} height={el.height} stroke={el.color} strokeWidth={3} fill="none" rx={4} />
      case 'ellipse':
        return (
          <ellipse cx={el.width / 2} cy={el.height / 2} rx={el.width / 2} ry={el.height / 2} stroke={el.color} strokeWidth={3} fill="none" />
        )
      case 'triangle':
        return (
          <polygon
            points={`${el.width / 2},0 0,${el.height} ${el.width},${el.height}`}
            stroke={el.color}
            strokeWidth={3}
            fill="none"
          />
        )
      case 'star':
        return <polygon points={starPoints(el.width, el.height)} stroke={el.color} strokeWidth={3} fill="none" />
      case 'arrow':
        return (
          <>
            <defs>
              <marker id={`arrow-${el.id}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill={el.color} />
              </marker>
            </defs>
            <line x1={0} y1={0} x2={el.width} y2={el.height} stroke={el.color} strokeWidth={3} markerEnd={`url(#arrow-${el.id})`} />
          </>
        )
      default:
        return null
    }
  }

  const renderElement = (el: DrawElement) => {
    const isSelected = tool === 'select' && selectedElId === el.id
    return (
      <g
        key={el.id}
        transform={`translate(${el.x},${el.y})`}
        onMouseDown={(e) => startMove(e, el)}
        style={{ cursor: tool === 'select' ? 'move' : 'default' }}
      >
        {renderShape(el)}
        {isSelected && (
          <>
            <rect
              x={-4}
              y={-4}
              width={el.width + 8}
              height={el.height + 8}
              fill="none"
              stroke="#38bdf8"
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            {RESIZE_HANDLES.map((h) => {
              const hx = h.includes('w') ? -4 : el.width + 4
              const hy = h.includes('n') ? -4 : el.height + 4
              return (
                <rect
                  key={h}
                  x={hx - 5}
                  y={hy - 5}
                  width={10}
                  height={10}
                  fill="#38bdf8"
                  style={{ cursor: `${h}-resize` }}
                  onMouseDown={(e) => startResize(e, el, h)}
                />
              )
            })}
          </>
        )}
      </g>
    )
  }

  const preview =
    drag?.mode === 'draw' && drag.rawPoints.length > 1
      ? tool === 'pen'
        ? (
            <path
              d={`M ${drag.rawPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`}
              stroke={data.color}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )
        : (() => {
            const xs = drag.rawPoints.map((p) => p.x)
            const ys = drag.rawPoints.map((p) => p.y)
            const minX = Math.min(...xs)
            const minY = Math.min(...ys)
            const maxX = Math.max(...xs)
            const maxY = Math.max(...ys)
            return (
              <rect
                x={minX}
                y={minY}
                width={maxX - minX}
                height={maxY - minY}
                stroke={data.color}
                strokeDasharray="5 4"
                strokeWidth={2}
                fill="none"
                opacity={0.6}
              />
            )
          })()
      : null

  return (
    <div className={`story-node story-node-draw${selected ? ' selected' : ''}${data.pinned ? ' pinned' : ''}`} style={{ borderColor: data.color }}>
      <NodeResizer isVisible={selected} minWidth={280} minHeight={240} lineClassName="nodrag" handleClassName="nodrag" />
      <Handle type="target" position={Position.Left} />
      <div className="story-node-header" style={{ background: data.color }}>
        <input
          className="story-node-title"
          value={data.label}
          onChange={(e) => title.handleChange(e, (v) => update({ label: v }))}
          placeholder="ชื่อ node"
        />
        <button type="button" className="story-node-pin nodrag" title={data.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'} onClick={togglePin}>
          📌
        </button>
        <button type="button" className="story-node-send nodrag" title="ส่งไปบอร์ดอื่น" onClick={sendToAnotherBoard}>
          📤
        </button>
        <button type="button" className="story-node-duplicate nodrag" title="ทำสำเนา node" onClick={duplicate}>
          ⧉
        </button>
        <input type="color" className="story-node-color" value={data.color} onChange={(e) => update({ color: e.target.value })} />
      </div>
      <div className="draw-toolbar nodrag">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`draw-tool-btn${tool === t.id ? ' active' : ''}`}
            title={t.title}
            onClick={() => {
              setTool(t.id)
              setSelectedElId(null)
            }}
          >
            {t.icon}
          </button>
        ))}
        {selectedElId && (
          <button type="button" className="draw-tool-btn draw-delete-btn" title="ลบรูปทรงที่เลือก" onClick={deleteSelected}>
            🗑
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="draw-tool-btn" title="ล้างทั้งหมด" onClick={clearAll}>
          ⌫
        </button>
      </div>
      <svg
        ref={svgRef}
        className="draw-canvas nodrag"
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={onCanvasMouseDown}
      >
        {elements.map(renderElement)}
        {preview}
      </svg>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
