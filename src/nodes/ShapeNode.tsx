import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { StoryNode } from '../types'
import { HIT_STROKE, MIN_SHAPE, SHAPE_STROKE } from '../shapes'
import { ArrowMarker, ShapeGeometry } from '../ShapeGeometry'

/**
 * A single free-floating drawing on the canvas.
 * Deliberately chromeless: no header, no title, no card background — just the
 * raw SVG geometry positioned at real flow coordinates. All the drag / select /
 * resize behaviour comes from React Flow itself, exactly like every other node.
 */
export default function ShapeNode({ id, data, selected, width, height }: NodeProps<StoryNode>) {
  const w = Math.max(width ?? MIN_SHAPE, 1)
  const h = Math.max(height ?? MIN_SHAPE, 1)
  const kind = data.shape ?? 'rect'
  const markerId = `sb-arrow-${id}`

  return (
    <div className="shape-node">
      <NodeResizer
        isVisible={!!selected}
        minWidth={MIN_SHAPE}
        minHeight={MIN_SHAPE}
        color="#38bdf8"
      />
      <svg className="shape-node-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {kind === 'arrow' && <ArrowMarker id={markerId} color={data.color} />}
        <g className="shape-hit">
          <ShapeGeometry
            kind={kind}
            width={w}
            height={h}
            points={data.points}
            stroke="transparent"
            strokeWidth={HIT_STROKE}
          />
        </g>
        <ShapeGeometry
          kind={kind}
          width={w}
          height={h}
          points={data.points}
          stroke={data.color}
          strokeWidth={SHAPE_STROKE}
          markerId={kind === 'arrow' ? markerId : undefined}
        />
        {selected && (
          <rect
            className="shape-node-outline"
            x={0}
            y={0}
            width={w}
            height={h}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
      </svg>
    </div>
  )
}
