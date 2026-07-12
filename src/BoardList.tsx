import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { BoardMeta } from './types'

export default function BoardList({
  session,
  onOpen,
}: {
  session: Session
  onOpen: (boardId: string) => void
}) {
  const [boards, setBoards] = useState<BoardMeta[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const { data } = await supabase
      .from('boards')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
    setBoards(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const createBoard = async () => {
    const name = window.prompt('ชื่อกระดานใหม่', 'เรื่องใหม่')
    if (!name) return
    const { data } = await supabase
      .from('boards')
      .insert({ owner: session.user.id, name, nodes: [], edges: [] })
      .select('id')
      .single()
    if (data) onOpen(data.id)
  }

  const renameBoard = async (board: BoardMeta) => {
    const name = window.prompt('ชื่อใหม่', board.name)
    if (!name) return
    await supabase.from('boards').update({ name }).eq('id', board.id)
    refresh()
  }

  const deleteBoard = async (board: BoardMeta) => {
    if (!window.confirm(`ลบกระดาน "${board.name}" ใช่ไหม? ลบแล้วกู้คืนไม่ได้`)) return
    await supabase.from('boards').delete().eq('id', board.id)
    refresh()
  }

  return (
    <div className="board-list-page fade-in">
      <div className="toolbar">
        <a className="hub-link" href="https://tensedbomsie.github.io/SatoruHUB/" title="กลับไป Satoru HUB">
          🏠
        </a>
        <h1>Storyboard ของคุณ</h1>
        <span className="spacer" />
        <span className="user-email">{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
      </div>
      <div className="board-list">
        <button className="board-card new" onClick={createBoard}>
          + สร้างกระดานใหม่
        </button>
        {loading && <p>กำลังโหลด...</p>}
        {boards.map((board) => (
          <div key={board.id} className="board-card">
            <div className="board-card-name" onClick={() => onOpen(board.id)}>
              {board.name}
            </div>
            <div className="board-card-actions">
              <button onClick={() => renameBoard(board)}>เปลี่ยนชื่อ</button>
              <button onClick={() => deleteBoard(board)}>ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
