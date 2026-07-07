import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { StoryNode } from '../types'

export default function TimelineNode({ id, data, selected }: NodeProps<StoryNode>) {
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
          placeholder="ชื่อเหตุการณ์"
        />
        <input
          type="color"
          className="story-node-color"
          value={data.color}
          onChange={(e) => update({ color: e.target.value })}
        />
      </div>
      <div className="story-node-timeline nodrag">
        <input
          type="text"
          className="story-node-date"
          value={data.date ?? ''}
          onChange={(e) => update({ date: e.target.value })}
          placeholder="เวลา/ลำดับ เช่น วันที่ 3, ก่อนฉากเปิด"
        />
        <textarea
          className="story-node-text"
          value={data.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="รายละเอียดเหตุการณ์..."
        />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
