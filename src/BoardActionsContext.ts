import { createContext, useContext } from 'react'
import type { StoryNode } from './types'

export const BoardActionsContext = createContext<{
  openSendNode: (node: StoryNode) => void
} | null>(null)

export function useBoardActions() {
  const ctx = useContext(BoardActionsContext)
  if (!ctx) throw new Error('useBoardActions must be used within BoardActionsContext.Provider')
  return ctx
}
