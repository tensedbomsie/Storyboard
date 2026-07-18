import { flushSync } from 'react-dom'
import type { ChangeEvent } from 'react'

export function useCursorPreserve<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const handleChange = (e: ChangeEvent<T>, apply: (value: string) => void) => {
    const el = e.target
    const pos = el.selectionStart
    const value = el.value
    flushSync(() => apply(value))
    el.setSelectionRange(pos, pos)
  }

  return { handleChange }
}
