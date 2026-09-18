import { useEffect, useRef, useState } from 'react'
import { THEMES, getStoredTheme, setTheme, type ThemeId } from './theme'

/**
 * Storyboard-local theme switcher.
 *
 * The palette itself is the shared cross-app one in `theme.ts` (persisted to
 * `localStorage['satoru_theme']`, applied as `data-theme` on <html>), so picking
 * here is exactly the same action Satoru HUB performs — this is only a local UI
 * for it, so you don't have to leave Storyboard to change theme.
 */
export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<ThemeId>(() => getStoredTheme())
  const rootRef = useRef<HTMLDivElement>(null)

  // close on outside click / Escape while the popover is open
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // another tab (or Satoru HUB itself) changed the shared theme — follow it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'satoru_theme') setCurrent(getStoredTheme())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const pick = (id: ThemeId) => {
    setTheme(id)
    setCurrent(id)
    setOpen(false)
  }

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        type="button"
        className="theme-picker-btn"
        title="เปลี่ยนธีมสี"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        🎨
      </button>
      {open && (
        <div className="theme-picker-menu" role="menu">
          <div className="theme-picker-title">ธีมสี</div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={t.id === current}
              className={`theme-picker-item${t.id === current ? ' active' : ''}`}
              onClick={() => pick(t.id)}
            >
              <span
                className="theme-picker-swatch"
                style={{
                  background: t.bg,
                  backgroundImage: `linear-gradient(135deg, ${t.accent} 0%, ${t.accent} 48%, ${t.accent2} 52%, ${t.accent2} 100%)`,
                }}
              />
              <span className="theme-picker-label">
                <span className="theme-picker-name">{t.name}</span>
                <span className="theme-picker-desc">{t.desc}</span>
              </span>
              {t.id === current && <span className="theme-picker-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
