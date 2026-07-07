import { useState } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import type { StoryNode } from '../types'
import { supabase } from '../lib/supabase'
import { useSessionContext } from '../SessionContext'
import { useStoryNode } from './useStoryNode'
import { useCursorPreserve } from './useCursorPreserve'

export default function ImageNode({ id, data, selected }: NodeProps<StoryNode>) {
  const { update, togglePin, sendToAnotherBoard } = useStoryNode(id)
  const { userId } = useSessionContext()
  const [uploading, setUploading] = useState(false)
  const title = useCursorPreserve<HTMLInputElement>()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const path = `${userId}/${id}-${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('board-images').upload(path, file)
    if (!error) {
      const { data: pub } = supabase.storage.from('board-images').getPublicUrl(path)
      update({ imageUrl: pub.publicUrl })
    }
    setUploading(false)
  }

  return (
    <div
      className={`story-node${selected ? ' selected' : ''}${data.pinned ? ' pinned' : ''}`}
      style={{ borderColor: data.color }}
    >
      <NodeResizer isVisible={selected} minWidth={200} minHeight={180} lineClassName="nodrag" handleClassName="nodrag" />
      <Handle type="target" position={Position.Left} />
      <div className="story-node-header" style={{ background: data.color }}>
        <input
          ref={title.ref}
          className="story-node-title"
          value={data.label}
          onChange={(e) => {
            title.captureCursor(e)
            update({ label: e.target.value })
          }}
          placeholder="ชื่อ node"
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
      <div className="story-node-image nodrag">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.label} />
        ) : (
          <div className="story-node-image-placeholder">
            {uploading ? 'กำลังอัปโหลด...' : 'ไม่มีรูป'}
          </div>
        )}
        <label className="story-node-upload-btn">
          อัปโหลดรูป
          <input type="file" accept="image/*" onChange={handleFile} hidden />
        </label>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
