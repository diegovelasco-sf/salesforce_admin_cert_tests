// Simulacro en curso: temporizador, paleta de preguntas, marcas y entrega (manual o al acabar el tiempo).
import { useEffect, useRef, useState, type Dispatch } from 'react'
import { EXAM } from '../domain/exam.ts'
import { toggleSelection } from '../domain/selection.ts'
import { remainingMs, unanswered, type ExamSession } from '../domain/session.ts'
import { question } from './bank.ts'
import { ConfirmDialog } from './common.tsx'
import { formatDuration, plural } from './format.ts'
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
      <aside className="card exam-panel" aria-label="Estado del simulacro">
        <div className={`timer${remaining <= WARNING_MS ? ' timer-warning' : ''}`} role="timer" aria-label="Tiempo restante">
          <span className="timer-label">Tiempo restante</span>
          <span className="timer-value">{formatDuration(remaining)}</span>
          {remaining <= WARNING_MS && <span className="timer-note">⚠ Quedan menos de 5 minutos</span>}
        </div>
        <p className="exam-counts">
          {total - pending} de {total} contestadas · {plural(session.flagged.length, 'marcada', 'marcadas')}
        </p>
        <Palette session={session} onGo={go} />
        <button type="button" className="primary wide" onClick={() => setConfirming(true)}>
          Entregar simulacro
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
          flagPurpose="revisar"
        />
        <div className="actions">
          <button type="button" disabled={session.current === 0} onClick={() => go(session.current - 1)}>
            ← Anterior
          </button>
          {session.current < total - 1 ? (
            <button type="button" className="primary" onClick={() => go(session.current + 1)}>
              Siguiente →
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => setConfirming(true)}>
              Entregar
            </button>
          )}
        </div>
        <p className="hint">Atajos: 1-5 marcan opciones · Enter o → siguiente · ← anterior · M marca para revisar</p>
      </div>

      <ConfirmDialog
        open={confirming}
        title="¿Entregar el simulacro?"
        confirmLabel="Entregar"
        cancelLabel="Seguir con el examen"
        onConfirm={() => {
          setConfirming(false)
          dispatch({ type: 'exam/submit', now: Date.now() })
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {pending
            ? `Te quedan ${plural(pending, 'pregunta', 'preguntas')} sin contestar; contarán como falladas.`
            : 'Has contestado todas las preguntas.'}{' '}
          {session.flagged.length > 0 && `Tienes ${plural(session.flagged.length, 'pregunta marcada', 'preguntas marcadas')} para revisar.`}
        </p>
        <p className="muted">
          Necesitas un {EXAM.passPercent} % para aprobar. Al entregar verás la corrección y no podrás cambiar las respuestas.
        </p>
      </ConfirmDialog>
    </div>
  )
}

function Palette({ session, onGo }: { session: ExamSession; onGo: (index: number) => void }) {
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
    <nav aria-label="Preguntas del simulacro">
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
                aria-label={`Pregunta ${i + 1}: ${answered ? 'contestada' : 'sin contestar'}${flagged ? ', marcada' : ''}`}
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
        <span className="swatch swatch-answered" /> contestada · <span className="palette-flag-inline">★</span> marcada · <span className="swatch swatch-current" /> actual
      </p>
    </nav>
  )
}
