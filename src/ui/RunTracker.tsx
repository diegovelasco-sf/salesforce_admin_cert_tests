// Seguimiento de una tanda de práctica, repaso o estudio: barra de progreso, aciertos, una cuadrícula con
// cada pregunta (acertada, fallada, actual o pendiente) para saltar a ella y el porcentaje de acierto. La
// cuadrícula y el porcentaje se ocultan por separado, y la preferencia se recuerda en todas las certificaciones.
import { useEffect, useRef, useState } from 'react'
import { useCert } from './cert.ts'
import { percent } from './format.ts'
import { useI18n } from './lang.ts'

const GRID_KEY = 'sf-run-tracker'
const SCORE_KEY = 'sf-run-tracker-score'

const readOpen = (key: string): boolean => {
  try {
    return window.localStorage.getItem(key) !== 'hidden'
  } catch {
    return true
  }
}

const saveOpen = (key: string, open: boolean): void => {
  try {
    if (open) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, 'hidden')
  } catch {
    // Sin almacenamiento solo se pierde la preferencia.
  }
}

/** Preferencia de mostrar u ocultar, guardada en `key`. */
function useOpen(key: string): [boolean, () => void] {
  const [open, setOpen] = useState(() => readOpen(key))
  return [
    open,
    () => {
      saveOpen(key, !open)
      setOpen(!open)
    },
  ]
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
  const { cert } = useCert()
  const [open, toggle] = useOpen(GRID_KEY)
  const [scoreOpen, toggleScore] = useOpen(SCORE_KEY)
  const list = useRef<HTMLOListElement>(null)
  const total = states.length
  const right = states.filter((s) => s === 'right').length
  const wrong = states.filter((s) => s === 'wrong').length
  const answered = right + wrong
  // Sobre las respondidas: lo que llevas acertado hasta ahora, no sobre el total de la tanda.
  const hit = percent(right, answered)
  const pass = cert.exam.passPercent
  const below = answered > 0 && hit < pass

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
        <span className="track-toggles">
          <button type="button" className="link-button" aria-expanded={open} aria-controls="track-grid" onClick={toggle}>
            {open ? t.tracker.hide : t.tracker.show}
          </button>
          <button type="button" className="link-button" aria-expanded={scoreOpen} aria-controls="track-score" onClick={toggleScore}>
            {scoreOpen ? t.tracker.hideScore : t.tracker.showScore}
          </button>
        </span>
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
      {scoreOpen && (
        <div className="track-hit" id="track-score" aria-live="polite">
          <span className="track-hit-label">{t.tracker.hitLabel}</span>
          <strong className="track-hit-value">{answered ? t.pct(hit) : '—'}</strong>
          <span
            className="track-hit-meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hit}
            aria-label={t.tracker.hitMeter(answered ? t.pct(hit) : '—', pass)}
          >
            {answered > 0 && <span className="track-hit-fill" style={{ width: `${Math.max(hit, 0.5)}%` }} />}
            <span className="track-hit-pass" style={{ left: `${pass}%` }} aria-hidden="true" />
          </span>
          <span className="muted track-hit-detail">
            {answered ? t.tracker.hitDetail(right, answered, pass) : t.tracker.hitEmpty}
            {below && t.tracker.hitBelow}
          </span>
        </div>
      )}
    </section>
  )
}
