import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './Login'
import BoardList from './BoardList'
import Board from './Board'
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)
  const [boardId, setBoardId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!checked) return null
  if (!session) return <Login />
  if (boardId) return <Board session={session} boardId={boardId} onBack={() => setBoardId(null)} />
  return <BoardList session={session} onOpen={setBoardId} />
}

export default App
