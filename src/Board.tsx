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

const nodeTypes = { text: TextNode, image: ImageNode }

const randomColor = () =>
  ['#7c3aed', '#dc2626', '#059669', '#d97706', '#2563eb'][
    Math.floor(Math.random() * 5)
  ]

export default function Board({ session }: { session: Session }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StoryNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loaded, setLoaded] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('boards')
        .select('nodes, edges')
        .eq('owner', session.user.id)
        .maybeSingle()

      if (data) {
        setNodes((data.nodes as StoryNode[]) ?? [])
        setEdges((data.edges as Edge[]) ?? [])
      }
      setLoaded(true)
    }
    load()
  }, [session.user.id, setNodes, setEdges])

  useEffect(() => {
    if (!loaded) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await supabase
        .from('boards')
        .upsert(
          { owner: session.user.id, nodes, edges, updated_at: new Date().toISOString() },
          { onConflict: 'owner' },
        )
    }, 800)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [nodes, edges, loaded, session.user.id])

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

  const addNode = (type: 'text' | 'image') => {
    const id = crypto.randomUUID()
    const newNode: StoryNode = {
      id,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: type === 'text' ? 'ไอเดียใหม่' : 'รูปใหม่',
        color: randomColor(),
        text: '',
        imageUrl: '',
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  return (
    <div className="board-page">
      <div className="toolbar">
        <button onClick={() => addNode('text')}>+ Text Node</button>
        <button onClick={() => addNode('image')}>+ Image Node</button>
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
    </div>
  )
}
