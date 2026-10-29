// Simulacro en curso: temporizador, paleta de preguntas, marcas y entrega (manual o al acabar el tiempo).
import { useEffect, useRef, useState, type Dispatch } from 'react'
import { neededToPass } from '../domain/grading.ts'
import { toggleSelection } from '../domain/selection.ts'
import { remainingMs, unanswered, type ExamSession } from '../domain/session.ts'
import { useCert } from './cert.ts'
import { ConfirmDialog } from './common.tsx'
import { formatDuration } from './format.ts'
import { useI18n } from './lang.ts'
import { QuestionCard } from './QuestionCard.tsx'
import type { Action } from './state.ts'
import { useNow } from './useNow.ts'
import { useShortcuts } from './useShortcuts.ts'

interface Props {
  session: ExamSession
  dispatch: Dispatch<Action>
}

const WARNING_MS = 5 * 60_000

export function Exam({ session, dispatch }: Props) {
  const { cert, question } = useCert()
  const { t } = useI18n()
  const { exam: rules } = cert
  const now = useNow()
  const [confirming, setConfirming] = useState(false)
  const remaining = remainingMs(session, now)
  const expired = remaining === 0

  useEffect(() => {
    if (expired) dispatch({ type: 'exam/submit', now: Date.now() })
  }, [expired, dispatch])

  const total = session.questionIds.length
  const id = session.questionIds[session.current]
  const current = question(id)
  const order = session.optionOrder[id]
  const selected = session.answers[id] ?? []
  const flagged = session.flagged.includes(id)
  const pending = unanswered(session)

  const go = (index: number) => dispatch({ type: 'exam/goto', index })
  const select = (keys: string[]) => dispatch({ type: 'exam/answer', id, keys })
  const toggleFlag = () => dispatch({ type: 'exam/flag', id })

  useShortcuts(
    {
      option: (i) => order[i] && select(toggleSelection(selected, order[i], current.correct.length)),
      enter: () => (session.current < total - 1 ? go(session.current + 1) : setConfirming(true)),
      flag: toggleFlag,
      prev: () => go(session.current - 1),
      next: () => go(session.current + 1),
    },
    !confirming,
  )

  return (
    <div className="exam-layout">
      <aside className="card exam-panel" aria-label={t.exam.panelLabel}>
        <div className={`timer${remaining <= WARNING_MS ? ' timer-warning' : ''}`} role="timer" aria-label={t.exam.timerLabel}>
          <span className="timer-label">{t.exam.timerLabel}</span>
          <span className="timer-value">{formatDuration(remaining)}</span>
          {remaining <= WARNING_MS && <span className="timer-note">{t.exam.timerWarning}</span>}
        </div>
        <p className="exam-counts">{t.exam.counts(total - pending, total, session.flagged.length)}</p>
        <Palette session={session} onGo={go} />
        <button type="button" className="primary wide" onClick={() => setConfirming(true)}>
          {t.exam.submitExam}
        </button>
      </aside>

      <div className="exam-main">
        <QuestionCard
          question={current}
          order={order}
          selected={selected}
          onSelect={select}
          revealed={false}
          position={{ index: session.current, total }}
          flagged={flagged}
          onToggleFlag={toggleFlag}
          flagContext="exam"
        />
        <div className="actions">
          <button type="button" disabled={session.current === 0} onClick={() => go(session.current - 1)}>
            {t.previous}
          </button>
          {session.current < total - 1 ? (
            <button type="button" className="primary" onClick={() => go(session.current + 1)}>
              {t.next}
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => setConfirming(true)}>
              {t.exam.submit}
            </button>
          )}
        </div>
        <p className="hint">{t.exam.hint}</p>
      </div>

      <ConfirmDialog
        open={confirming}
        title={t.exam.confirmTitle}
        confirmLabel={t.exam.submit}
        cancelLabel={t.exam.keepGoing}
        onConfirm={() => {
          setConfirming(false)
          dispatch({ type: 'exam/submit', now: Date.now() })
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {pending ? t.exam.pending(pending) : t.exam.allAnswered} {session.flagged.length > 0 && t.exam.flagged(session.flagged.length)}
        </p>
        <p className="muted">{t.exam.rules(rules, neededToPass(rules.scoredCount, rules.passPercent))}</p>
      </ConfirmDialog>
    </div>
  )
}

function Palette({ session, onGo }: { session: ExamSession; onGo: (index: number) => void }) {
  const { t } = useI18n()
  const list = useRef<HTMLOListElement>(null)
  // La paleta tiene scroll propio (en móvil es baja): mantiene visible la pregunta actual sin mover la página.
  useEffect(() => {
    const container = list.current
    const item = container?.querySelector<HTMLElement>('.palette-item.current')
    if (!container || !item) return
    // .palette tiene position: relative, así que offsetTop ya es relativo a ella.
    const top = item.offsetTop
    if (top < container.scrollTop) container.scrollTop = top - 6
    else if (top + item.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = top + item.offsetHeight - container.clientHeight + 6
    }
  }, [session.current])

  return (
    <nav aria-label={t.exam.paletteLabel}>
      <ol className="palette" ref={list}>
        {session.questionIds.map((id, i) => {
          const answered = !!session.answers[id]?.length
          const flagged = session.flagged.includes(id)
          const current = i === session.current
          return (
            <li key={id}>
              <button
                type="button"
                className={`palette-item${answered ? ' answered' : ''}${flagged ? ' flagged' : ''}${current ? ' current' : ''}`}
                aria-current={current ? 'step' : undefined}
                aria-label={t.exam.paletteItem(i + 1, answered, flagged)}
                onClick={() => onGo(i)}
              >
                {i + 1}
                {flagged && (
                  <span className="palette-flag" aria-hidden="true">
                    ★
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="palette-legend muted" aria-hidden="true">
        <span className="swatch swatch-answered" /> {t.exam.legendAnswered} · <span className="palette-flag-inline">★</span> {t.exam.legendFlagged} ·{' '}
        <span className="swatch swatch-current" /> {t.exam.legendCurrent}
      </p>
    </nav>
  )
}
