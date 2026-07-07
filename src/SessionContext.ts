import { createContext, useContext } from 'react'

export const SessionContext = createContext<{ userId: string } | null>(null)

export function useSessionContext() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessionContext must be used within SessionContext.Provider')
  return ctx
}
