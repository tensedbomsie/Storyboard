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
import type { BoardMeta, StoryNode } from './types'
import TextNode from './nodes/TextNode'
import ImageNode from './nodes/ImageNode'
import TimelineNode from './nodes/TimelineNode'
import { SessionContext } from './SessionContext'
import { BoardActionsContext } from './BoardActionsContext'
import { NodesContext } from './NodesContext'
import { buildExportText, buildBackupText, parseBackupText } from './export'

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
  const [exportMode, setExportMode] = useState<'ai' | 'backup' | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [sendNode, setSendNode] = useState<StoryNode | null>(null)
  const [otherBoards, setOtherBoards] = useState<BoardMeta[]>([])
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastKnownUpdatedAt = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoaded(false)
    const { data } = await supabase
      .from('boards')
      .select('nodes, edges, name, updated_at')
      .eq('id', boardId)
      .maybeSingle()

    setNodes((data?.nodes as StoryNode[]) ?? [])
    setEdges((data?.edges as Edge[]) ?? [])
    setBoardName(data?.name ?? '')
    lastKnownUpdatedAt.current = data?.updated_at ?? null
    setConflict(false)
    setLoaded(true)
  }, [boardId, setNodes, setEdges])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!loaded || conflict) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      const newUpdatedAt = new Date().toISOString()
      let query = supabase
        .from('boards')
        .update({ nodes, edges, updated_at: newUpdatedAt })
        .eq('id', boardId)
      // optimistic concurrency: only overwrite if no one else has saved since we loaded
      if (lastKnownUpdatedAt.current) {
        query = query.eq('updated_at', lastKnownUpdatedAt.current)
      }
      const { data } = await query.select('updated_at').maybeSingle()

      if (!data) {
        // another tab/session saved a newer version first — don't clobber it
        setConflict(true)
      } else {
        lastKnownUpdatedAt.current = data.updated_at
      }
    }, 800)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [nodes, edges, loaded, conflict, boardId])

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

  const selectedNodes = nodes.filter((n) => n.selected)

  const applyColorToSelection = (color: string) => {
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, data: { ...n.data, color } } : n)))
  }

  const openExport = () => {
    setCopyStatus(null)
    setExportMode('ai')
  }

  const currentExportText =
    exportMode === 'ai'
      ? buildExportText(boardName, nodes, edges)
      : exportMode === 'backup'
        ? buildBackupText(boardName, nodes, edges)
        : ''

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(currentExportText)
      setCopyStatus('คัดลอกแล้ว!')
    } catch {
      setCopyStatus('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความแล้วกด Ctrl+C เอง')
    }
  }

  const openImport = () => {
    setImportText('')
    setImportStatus(null)
    setImportOpen(true)
  }

  const runImport = () => {
    try {
      const { nodes: importedNodes, edges: importedEdges } = parseBackupText(importText)
      const idMap = new Map<string, string>()
      const newNodes: StoryNode[] = importedNodes.map((n) => {
        const newId = crypto.randomUUID()
        idMap.set(n.id, newId)
        return { ...n, id: newId, selected: false, dragging: false }
      })
      const newEdges: Edge[] = importedEdges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({
          ...e,
          id: crypto.randomUUID(),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
        }))
      setNodes((nds) => [...nds, ...newNodes])
      setEdges((eds) => [...eds, ...newEdges])
      setImportStatus(`นำเข้าแล้ว ${newNodes.length} node, ${newEdges.length} เส้นเชื่อม`)
    } catch {
      setImportStatus('ไฟล์ไม่ถูกต้อง กรุณาวางข้อความจาก "Export → สำรองข้อมูล (JSON)" ของบอร์ดนี้เท่านั้น')
    }
  }

  const openSendNode = async (node: StoryNode) => {
    setSendStatus(null)
    setSendNode(node)
    const { data } = await supabase
      .from('boards')
      .select('id, name, created_at')
      .neq('id', boardId)
      .order('created_at', { ascending: false })
    setOtherBoards(data ?? [])
  }

  const sendNodeTo = async (targetBoardId: string) => {
    if (!sendNode) return
    const { data } = await supabase
      .from('boards')
      .select('nodes')
      .eq('id', targetBoardId)
      .maybeSingle()
    const targetNodes = (data?.nodes as StoryNode[]) ?? []
    const copy: StoryNode = {
      ...sendNode,
      id: crypto.randomUUID(),
      selected: false,
      dragging: false,
    }
    await supabase
      .from('boards')
      .update({ nodes: [...targetNodes, copy], updated_at: new Date().toISOString() })
      .eq('id', targetBoardId)
    setSendStatus('ส่งไปบอร์ดปลายทางแล้ว!')
  }

  return (
    <SessionContext.Provider value={{ userId: session.user.id }}>
      <NodesContext.Provider value={{ setNodes }}>
      <BoardActionsContext.Provider value={{ openSendNode }}>
        <div className="board-page fade-in">
          <div className="toolbar">
            <a className="hub-link" href="https://tensedbomsie.github.io/SatoruHUB/" title="กลับไป Satoru HUB">
              🏠
            </a>
            <button onClick={onBack}>← กระดานทั้งหมด</button>
            <button onClick={() => addNode('text')}>+ Text Node</button>
            <button onClick={() => addNode('image')}>+ Image Node</button>
            <button onClick={() => addNode('timeline')}>+ Timeline Node</button>
            <button onClick={openExport}>Export</button>
            <button onClick={openImport}>Import</button>
            {selectedNodes.length > 1 && (
              <span className="batch-color">
                เปลี่ยนสี {selectedNodes.length} node ที่เลือก
                <input
                  type="color"
                  value={selectedNodes[0].data.color}
                  onChange={(e) => applyColorToSelection(e.target.value)}
                  title="เปลี่ยนสี node ที่เลือกทั้งหมด"
                />
              </span>
            )}
            {conflict && (
              <span className="conflict-warning">
                ⚠️ มีการแก้ไขจากแท็บ/เครื่องอื่นที่ใหม่กว่า การเปลี่ยนแปลงในแท็บนี้ยังไม่ถูกบันทึก
                <button onClick={load}>โหลดเวอร์ชันล่าสุด</button>
              </span>
            )}
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
          {exportMode !== null && (
            <div className="export-modal-backdrop" onClick={() => setExportMode(null)}>
              <div className="export-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Export storyboard</h2>
                <div className="export-mode-toggle">
                  <button
                    className={exportMode === 'ai' ? 'active' : ''}
                    onClick={() => { setExportMode('ai'); setCopyStatus(null) }}
                  >
                    ข้อความสำหรับ AI
                  </button>
                  <button
                    className={exportMode === 'backup' ? 'active' : ''}
                    onClick={() => { setExportMode('backup'); setCopyStatus(null) }}
                  >
                    สำรองข้อมูล (JSON)
                  </button>
                </div>
                <p>
                  {exportMode === 'ai'
                    ? 'คัดลอกข้อความนี้ไปวางให้ ChatGPT หรือ Claude ช่วยเกลาเนื้อเรื่องได้เลย'
                    : 'ไฟล์นี้ import กลับเข้าบอร์ดได้แม่นยำ (เก็บตำแหน่ง สี ขนาดครบ) เก็บไว้ backup หรือย้ายไปบอร์ดอื่นได้'}
                </p>
                <textarea readOnly value={currentExportText} onFocus={(e) => e.target.select()} />
                <div className="export-modal-actions">
                  {copyStatus && <span className="export-status">{copyStatus}</span>}
                  <span className="spacer" />
                  <button onClick={copyExport}>คัดลอก</button>
                  <button onClick={() => setExportMode(null)}>ปิด</button>
                </div>
              </div>
            </div>
          )}
          {importOpen && (
            <div className="export-modal-backdrop" onClick={() => setImportOpen(false)}>
              <div className="export-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Import ข้อมูลเข้าบอร์ด</h2>
                <p>วางข้อความจาก "Export → สำรองข้อมูล (JSON)" ที่คัดลอกไว้ก่อนหน้า — จะถูกเพิ่มเข้าบอร์ดนี้เป็น node ใหม่ (ของเดิมในบอร์ดยังอยู่)</p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='วางข้อความ JSON ที่ export มาที่นี่'
                />
                <div className="export-modal-actions">
                  {importStatus && <span className="export-status">{importStatus}</span>}
                  <span className="spacer" />
                  <button onClick={runImport} disabled={!importText.trim()}>นำเข้า</button>
                  <button onClick={() => setImportOpen(false)}>ปิด</button>
                </div>
              </div>
            </div>
          )}
          {sendNode !== null && (
            <div className="export-modal-backdrop" onClick={() => setSendNode(null)}>
              <div className="export-modal" onClick={(e) => e.stopPropagation()}>
                <h2>ส่ง "{sendNode.data.label}" ไปบอร์ดไหน?</h2>
                <p>จะคัดลอก node นี้ไปวางไว้ในบอร์ดปลายทาง (ต้นฉบับในบอร์ดนี้ยังอยู่เหมือนเดิม)</p>
                <div className="board-pick-list">
                  {otherBoards.length === 0 && <p>ยังไม่มีบอร์ดอื่นให้เลือกครับ</p>}
                  {otherBoards.map((b) => (
                    <button key={b.id} onClick={() => sendNodeTo(b.id)}>
                      {b.name}
                    </button>
                  ))}
                </div>
                <div className="export-modal-actions">
                  {sendStatus && <span className="export-status">{sendStatus}</span>}
                  <span className="spacer" />
                  <button onClick={() => setSendNode(null)}>ปิด</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BoardActionsContext.Provider>
      </NodesContext.Provider>
    </SessionContext.Provider>
  )
}
