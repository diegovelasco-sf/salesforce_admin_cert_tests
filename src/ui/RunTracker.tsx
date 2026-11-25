// Seguimiento de una tanda de práctica, repaso o estudio: barra de progreso, aciertos y una cuadrícula con
// cada pregunta (acertada, fallada, actual o pendiente) para saltar a ella. La cuadrícula se puede ocultar
// y la preferencia se recuerda en todas las certificaciones.
import { useEffect, useRef, useState } from 'react'
import { useI18n } from './lang.ts'

const OPEN_KEY = 'sf-run-tracker'

const readOpen = (): boolean => {
  try {
    return window.localStorage.getItem(OPEN_KEY) !== 'hidden'
  } catch {
    return true
  }
}

const saveOpen = (open: boolean): void => {
  try {
    if (open) window.localStorage.removeItem(OPEN_KEY)
    else window.localStorage.setItem(OPEN_KEY, 'hidden')
  } catch {
    // Sin almacenamiento solo se pierde la preferencia.
  }
}

export type TrackState = 'right' | 'wrong' | 'pending'

interface Props {
  title: string
  /** Estado de cada pregunta, en el orden de la tanda. */
  states: readonly TrackState[]
  current: number
  onGo: (index: number) => void
}

export function RunTracker({ title, states, current, onGo }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(readOpen)
  const list = useRef<HTMLOListElement>(null)
  const total = states.length
  const right = states.filter((s) => s === 'right').length
  const wrong = states.filter((s) => s === 'wrong').length
  const answered = right + wrong

  // Con muchas preguntas la cuadrícula tiene scroll propio: mantiene visible la actual sin mover la página.
  useEffect(() => {
    const container = list.current
    const item = container?.querySelector<HTMLElement>('.track-item.current')
    if (!container || !item) return
    const top = item.offsetTop
    if (top < container.scrollTop) container.scrollTop = top - 6
    else if (top + item.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = top + item.offsetHeight - container.clientHeight + 6
    }
  }, [current, open])

  const toggle = () => {
    saveOpen(!open)
    setOpen(!open)
  }

  return (
    <section className="card run-tracker" aria-label={t.tracker.label}>
      <div
        className="track-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-label={t.tracker.progress(answered, total)}
      >
        <span className="track-fill" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
      </div>
      <div className="track-head">
        <h1 className="track-title">{title}</h1>
        <span className="muted track-count">{t.tracker.progress(answered, total)}</span>
        <span className="track-score">
          <span className="track-chip track-chip-right">{t.tracker.right(right)}</span>
          <span className="track-chip track-chip-wrong">{t.tracker.wrong(wrong)}</span>
        </span>
        <button type="button" className="link-button track-toggle" aria-expanded={open} aria-controls="track-grid" onClick={toggle}>
          {open ? t.tracker.hide : t.tracker.show}
        </button>
      </div>
      {open && (
        <nav aria-label={t.tracker.gridLabel}>
          <ol className="track-grid" id="track-grid" ref={list}>
            {states.map((state, i) => {
              const isCurrent = i === current
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`track-item track-${state}${isCurrent ? ' current' : ''}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={t.tracker.item(i + 1, state)}
                    title={t.tracker.item(i + 1, state)}
                    onClick={() => onGo(i)}
                  >
                    {i + 1}
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="track-legend muted" aria-hidden="true">
            <span className="track-swatch track-right" /> {t.tracker.legendRight} · <span className="track-swatch track-wrong" /> {t.tracker.legendWrong} ·{' '}
            <span className="track-swatch track-pending" /> {t.tracker.legendPending} · <span className="track-swatch track-pending current" />{' '}
            {t.tracker.legendCurrent}
          </p>
        </nav>
      )}
    </section>
  )
}
