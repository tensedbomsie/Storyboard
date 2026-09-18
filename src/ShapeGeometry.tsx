import type { ShapeKind } from './types'
import { freehandPath, starPoints, type Pt } from './shapes'

/**
 * The raw SVG geometry of a shape, drawn in its own local box (0,0)-(width,height).
 * Rendered twice per shape: once transparent + fat for hit-testing, once for real.
 */
export function ShapeGeometry({
  kind,
  width,
  height,
  points,
  stroke,
  strokeWidth,
  markerId,
  opacity,
}: {
  kind: ShapeKind
  width: number
  height: number
  points?: Pt[]
  stroke: string
  strokeWidth: number
  markerId?: string
  opacity?: number
}) {
  const common = {
    stroke,
    strokeWidth,
    fill: 'none',
    opacity,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (kind) {
    case 'freehand':
      return <path d={freehandPath(points ?? [], width, height)} {...common} />
    case 'rect':
      return <rect x={0} y={0} width={width} height={height} rx={4} {...common} />
    case 'ellipse':
      return <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} {...common} />
    case 'triangle':
      return <polygon points={`${width / 2},0 0,${height} ${width},${height}`} {...common} />
    case 'star':
      return <polygon points={starPoints(width, height)} {...common} />
    case 'arrow': {
      const a = points?.[0] ?? { x: 0, y: 0 }
      const b = points?.[1] ?? { x: 1, y: 1 }
      return (
        <line
          x1={a.x * width}
          y1={a.y * height}
          x2={b.x * width}
          y2={b.y * height}
          markerEnd={markerId ? `url(#${markerId})` : undefined}
          {...common}
        />
      )
    }
    default:
      return null
  }
}

export function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <marker
        id={id}
        markerWidth={6}
        markerHeight={6}
        refX={5}
        refY={3}
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L6,3 L0,6 Z" fill={color} />
      </marker>
    </defs>
  )
}
