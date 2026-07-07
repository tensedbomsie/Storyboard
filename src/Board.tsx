import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { StoryNode } from './types'
import TextNode from './nodes/TextNode'
import ImageNode from './nodes/ImageNode'
import TimelineNode from './nodes/TimelineNode'
import { SessionContext } from './SessionContext'
import { buildExportText } from './export'

const nodeTypes = { text: TextNode, image: ImageNode, timeline: TimelineNode }

const randomColor = () =>
  ['#7c3aed', '#dc2626', '#059669', '#d97706', '#2563eb'][
    Math.floor(Math.random() * 5)
  ]

export default function Board({
  session,
  boardId,
  onBack,
}: {
  session: Session
  boardId: string
  onBack: () => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StoryNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [boardName, setBoardName] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [exportText, setExportText] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoaded(false)
    const load = async () => {
      const { data } = await supabase
        .from('boards')
        .select('nodes, edges, name')
        .eq('id', boardId)
        .maybeSingle()

      setNodes((data?.nodes as StoryNode[]) ?? [])
      setEdges((data?.edges as Edge[]) ?? [])
      setBoardName(data?.name ?? '')
      setLoaded(true)
    }
    load()
  }, [boardId, setNodes, setEdges])

  useEffect(() => {
    if (!loaded) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await supabase
        .from('boards')
        .update({ nodes, edges, updated_at: new Date().toISOString() })
        .eq('id', boardId)
    }, 800)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [nodes, edges, loaded, boardId])

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const label = window.prompt('ป้ายกำกับเส้นเชื่อม', String(edge.label ?? ''))
      if (label === null) return
      setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, label } : e)))
    },
    [setEdges],
  )

  const addNode = (type: 'text' | 'image' | 'timeline') => {
    const id = crypto.randomUUID()
    const labels = { text: 'ไอเดียใหม่', image: 'รูปใหม่', timeline: 'เหตุการณ์ใหม่' }
    const sizes = { text: [220, 180], image: [220, 260], timeline: [240, 200] } as const
    const [width, height] = sizes[type]
    const newNode: StoryNode = {
      id,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      width,
      height,
      data: {
        label: labels[type],
        color: randomColor(),
        text: '',
        imageUrl: '',
        date: '',
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  const openExport = () => {
    setCopyStatus(null)
    setExportText(buildExportText(boardName, nodes, edges))
  }

  const copyExport = async () => {
    if (!exportText) return
    try {
      await navigator.clipboard.writeText(exportText)
      setCopyStatus('คัดลอกแล้ว!')
    } catch {
      setCopyStatus('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความแล้วกด Ctrl+C เอง')
    }
  }

  return (
    <SessionContext.Provider value={{ userId: session.user.id }}>
      <div className="board-page">
        <div className="toolbar">
          <button onClick={onBack}>← กระดานทั้งหมด</button>
          <button onClick={() => addNode('text')}>+ Text Node</button>
          <button onClick={() => addNode('image')}>+ Image Node</button>
          <button onClick={() => addNode('timeline')}>+ Timeline Node</button>
          <button onClick={openExport}>Export</button>
          <span className="spacer" />
          <span className="user-email">{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
        </div>
        <div className="canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeDoubleClick={onEdgeDoubleClick}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        {exportText !== null && (
          <div className="export-modal-backdrop" onClick={() => setExportText(null)}>
            <div className="export-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Export storyboard</h2>
              <p>คัดลอกข้อความนี้ไปวางให้ ChatGPT หรือ Claude ช่วยเกลาเนื้อเรื่องได้เลย</p>
              <textarea readOnly value={exportText} onFocus={(e) => e.target.select()} />
              <div className="export-modal-actions">
                {copyStatus && <span className="export-status">{copyStatus}</span>}
                <span className="spacer" />
                <button onClick={copyExport}>คัดลอก</button>
                <button onClick={() => setExportText(null)}>ปิด</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SessionContext.Provider>
  )
}
