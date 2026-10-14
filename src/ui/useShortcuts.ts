import { useEffect, useLayoutEffect, useRef } from 'react'

export interface Shortcuts {
  /** Tecla 1-5: opción en esa posición. */
  option?: (index: number) => void
  /** Enter: acción principal (comprobar, siguiente…). */
  enter?: () => void
  /** M: marcar para repasar. */
  flag?: () => void
  prev?: () => void
  next?: () => void
}

/** Atajos de teclado globales mientras `enabled`. No interfieren con campos de texto ni con Enter sobre botones. */
export function useShortcuts(shortcuts: Shortcuts, enabled = true): void {
  const latest = useRef(shortcuts)
  useLayoutEffect(() => {
    latest.current = shortcuts
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('textarea, select, [contenteditable="true"], input:not([type="radio"]):not([type="checkbox"])')) return
      const s = latest.current
      const onInput = !!target?.closest('input')
      let handled = true
      if (/^[1-5]$/.test(event.key) && s.option) s.option(Number(event.key) - 1)
      else if (event.key === 'Enter' && s.enter && !target?.closest('button, a, summary')) s.enter()
      else if (event.key.toLowerCase() === 'm' && s.flag) s.flag()
      // Sobre un radio las flechas cambian la opción: ahí no se usan para navegar.
      else if (event.key === 'ArrowLeft' && s.prev && !onInput) s.prev()
      else if (event.key === 'ArrowRight' && s.next && !onInput) s.next()
      else handled = false
      if (handled) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
