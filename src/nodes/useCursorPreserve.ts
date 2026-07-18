import { useLayoutEffect, useRef, type ChangeEvent } from 'react'

export function useCursorPreserve<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const ref = useRef<T>(null)
  const posRef = useRef<number | null>(null)
  const dirtyRef = useRef(false)

  useLayoutEffect(() => {
    if (!dirtyRef.current) return
    if (ref.current && posRef.current !== null && document.activeElement === ref.current) {
      ref.current.selectionStart = posRef.current
      ref.current.selectionEnd = posRef.current
      dirtyRef.current = false
    }
  })

  const captureCursor = (e: ChangeEvent<T>) => {
    posRef.current = e.target.selectionStart
    dirtyRef.current = true
  }

  return { ref, captureCursor }
}
