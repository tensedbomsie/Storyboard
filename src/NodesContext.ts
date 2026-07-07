import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { StoryNode } from './types'

export const NodesContext = createContext<{
  setNodes: Dispatch<SetStateAction<StoryNode[]>>
} | null>(null)

export function useNodesContext() {
  const ctx = useContext(NodesContext)
  if (!ctx) throw new Error('useNodesContext must be used within NodesContext.Provider')
  return ctx
}
