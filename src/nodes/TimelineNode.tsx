import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import type { StoryNode } from '../types'
import { useStoryNode } from './useStoryNode'

export default function TimelineNode({ id, data, selected }: NodeProps<StoryNode>) {
  const { update, togglePin, sendToAnotherBoard } = useStoryNode(id)

  return (
    <div
      className={`story-node${selected ? ' selected' : ''}${data.pinned ? ' pinned' : ''}`}
      style={{ borderColor: data.color }}
    >
      <NodeResizer isVisible={selected} minWidth={200} minHeight={160} lineClassName="nodrag" handleClassName="nodrag" />
      <Handle type="target" position={Position.Left} />
      <div className="story-node-header" style={{ background: data.color }}>
        <input
          className="story-node-title"
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="ชื่อเหตุการณ์"
        />
        <button
          type="button"
          className="story-node-pin nodrag"
          title={data.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
          onClick={togglePin}
        >
          📌
        </button>
        <button
          type="button"
          className="story-node-send nodrag"
          title="ส่งไปบอร์ดอื่น"
          onClick={sendToAnotherBoard}
        >
          📤
        </button>
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
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
