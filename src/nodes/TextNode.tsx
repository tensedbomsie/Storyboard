import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { StoryNode } from '../types'

export default function TextNode({ id, data, selected }: NodeProps<StoryNode>) {
  const { setNodes } = useReactFlow()

  const update = (patch: Partial<StoryNode['data']>) => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  return (
    <div
      className={`story-node${selected ? ' selected' : ''}`}
      style={{ borderColor: data.color }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="story-node-header" style={{ background: data.color }}>
        <input
          className="story-node-title"
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="ชื่อ node"
        />
        <input
          type="color"
          className="story-node-color"
          value={data.color}
          onChange={(e) => update({ color: e.target.value })}
        />
      </div>
      <textarea
        className="story-node-text nodrag"
        value={data.text ?? ''}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="เขียนไอเดีย..."
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
