// Inicio: avisos, simulacro a medias, los tres modos y un resumen del progreso.
import { useState, type Dispatch } from 'react'
import { EXAM, sectionLabel } from '../domain/exam.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { filterPool } from '../domain/sampling.ts'
import { createExamSession, isSubmitted, remainingMs } from '../domain/session.ts'
import { inReview } from '../domain/stats.ts'
import type { Progress } from '../domain/storage.ts'
import { BANK } from './bank.ts'
import { ConfirmDialog, Stat } from './common.tsx'
import { formatDuration, percent, plural } from './format.ts'
import { makeRun, type Action } from './state.ts'
import { useNow } from './useNow.ts'

/** En desarrollo, ?min=N acorta el simulacro a N minutos para probar la entrega automática. */
function examDurationMs(): number {
  const minutes = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('min')) : 0
  return (minutes > 0 ? minutes : EXAM.durationMinutes) * 60_000
}

export function Home({ progress, notices, dispatch }: { progress: Progress; notices: string[]; dispatch: Dispatch<Action> }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const now = useNow()
  const exam = progress.activeExam && !isSubmitted(progress.activeExam) ? progress.activeExam : undefined
  const reviewQuestions = BANK.questions.filter((q) => inReview(progress.stats[q.id], progress.flagged.includes(q.id)))
  const seen = BANK.questions.filter((q) => progress.stats[q.id]).length
  const totals = Object.values(progress.stats).reduce((acc, s) => ({ correct: acc.correct + s.correct, seen: acc.seen + s.seen }), {
    correct: 0,
    seen: 0,
  })
  const lastExam = progress.history.at(-1)

  const startExam = () => {
    const seed = randomSeed()
    const pool = filterPool(BANK.questions, progress.settings)
    const { session, shortfall } = createExamSession(BANK, pool, { now: Date.now(), seed, rng: mulberry32(seed), durationMs: examDurationMs() })
    const messages = [
      session.questionIds.length < EXAM.questionCount &&
        `Con tus ajustes solo hay ${session.questionIds.length} preguntas disponibles, así que el simulacro es más corto que el real.`,
      shortfall.length > 0 &&
        `No hay preguntas suficientes de ${shortfall.map(sectionLabel).join(', ')}: su hueco se ha cubierto con otras secciones.`,
    ].filter(Boolean)
    dispatch({ type: 'exam/start', session, notice: messages.join(' ') || undefined })
  }

  const startReview = () => {
    const rng = mulberry32(randomSeed())
    dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('Repaso', reviewQuestions, rng) } })
  }

  return (
    <div className="home">
      {notices.map((notice, index) => (
        <div key={notice} className="notice" role="status">
          <span>{notice}</span>
          <button type="button" className="link-button" onClick={() => dispatch({ type: 'notice/dismiss', index })}>
            Cerrar
          </button>
        </div>
      ))}

      {exam && (
        <section className="card resume" aria-label="Simulacro a medias">
          <div>
            <h2>Tienes un simulacro a medias</h2>
            <p className="muted">
              Quedan {formatDuration(remainingMs(exam, now))} · {plural(Object.keys(exam.answers).length, 'pregunta contestada', 'preguntas contestadas')}{' '}
              de {exam.questionIds.length}. El tiempo sigue corriendo aunque cierres la página.
            </p>
          </div>
          <div className="actions">
            <button type="button" className="danger" onClick={() => setConfirmDiscard(true)}>
              Descartar
            </button>
            <button type="button" className="primary" onClick={() => dispatch({ type: 'navigate', screen: { name: 'exam' } })}>
              Reanudar
            </button>
          </div>
        </section>
      )}

      <div className="modes">
        <section className="card mode">
          <h2>Práctica</h2>
          <p>Compruebas cada respuesta al momento y ves la explicación. Puedes filtrar por sección y por fuente.</p>
          <button type="button" className="primary" onClick={() => dispatch({ type: 'navigate', screen: { name: 'practice-setup' } })}>
            Practicar
          </button>
        </section>
        <section className="card mode">
          <h2>Simulacro</h2>
          <p>
            {EXAM.questionCount} preguntas repartidas como en el examen, {EXAM.durationMinutes} minutos y aprobado con el {EXAM.passPercent} %.
            La corrección llega al entregar.
          </p>
          <button type="button" className="primary" disabled={!!exam} onClick={startExam}>
            {exam ? 'Ya tienes uno a medias' : 'Empezar simulacro'}
          </button>
        </section>
        <section className="card mode">
          <h2>Repaso</h2>
          <p>
            {reviewQuestions.length
              ? `${plural(reviewQuestions.length, 'pregunta pendiente', 'preguntas pendientes')}: las que has fallado y las que has marcado. Salen al acertarlas dos veces seguidas.`
              : 'Aquí aparecerán las preguntas que falles o marques, hasta que las aciertes dos veces seguidas.'}
          </p>
          <button type="button" className="primary" disabled={!reviewQuestions.length} onClick={startReview}>
            Repasar
          </button>
        </section>
      </div>

      <section aria-label="Tu progreso">
        <div className="kpis">
          <Stat label="Preguntas vistas" value={`${seen} de ${BANK.questions.length}`} />
          <Stat label="Acierto global" value={totals.seen ? `${percent(totals.correct, totals.seen)} %` : '—'} detail={totals.seen ? plural(totals.seen, 'respuesta', 'respuestas') : undefined} />
          <Stat label="En repaso" value={reviewQuestions.length} />
          <Stat
            label="Último simulacro"
            value={lastExam ? `${percent(lastExam.correct, lastExam.total)} %` : '—'}
            detail={lastExam ? (lastExam.passed ? '✓ aprobado' : '✗ suspendido') : undefined}
          />
        </div>
      </section>

      <ConfirmDialog
        open={confirmDiscard}
        title="¿Descartar el simulacro?"
        confirmLabel="Descartar"
        danger
        onConfirm={() => {
          setConfirmDiscard(false)
          dispatch({ type: 'exam/close' })
        }}
        onCancel={() => setConfirmDiscard(false)}
      >
        <p>Se perderán sus respuestas y no contará en el historial.</p>
      </ConfirmDialog>
    </div>
  )
}
