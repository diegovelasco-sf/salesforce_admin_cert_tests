// Resultado de un simulacro entregado: nota, KPIs, acierto por sección y corrección pregunta a pregunta.
import { useState, type Dispatch } from 'react'
import { EXAM } from '../domain/exam.ts'
import { grade, isCorrect } from '../domain/grading.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import type { ExamSession } from '../domain/session.ts'
import { question } from './bank.ts'
import { PassBadge, Stat } from './common.tsx'
import { formatDuration, plural } from './format.ts'
import { QuestionCard } from './QuestionCard.tsx'
import { SectionBars } from './SectionBars.tsx'
import { makeRun, type Action } from './state.ts'

type Filter = 'failed' | 'flagged' | 'all'

export function Results({ session, dispatch }: { session: ExamSession; dispatch: Dispatch<Action> }) {
  const [filter, setFilter] = useState<Filter>('failed')
  const [open, setOpen] = useState<string | undefined>()
  const questions = session.questionIds.map(question)
  const score = grade(questions, session.answers)
  const needed = Math.ceil((EXAM.passPercent * score.total) / 100)
  const used = (session.submittedAt ?? session.deadline) - session.startedAt
  const failed = questions.filter((q) => !isCorrect(q, session.answers[q.id]))
  const unansweredCount = questions.filter((q) => !session.answers[q.id]?.length).length
  const visible = questions.filter(
    (q) => filter === 'all' || (filter === 'failed' ? failed.includes(q) : session.flagged.includes(q.id)),
  )

  const practiceFailed = () => {
    const rng = mulberry32(randomSeed())
    dispatch({ type: 'exam/close', next: { name: 'practice', run: makeRun('Falladas del simulacro', failed, rng) } })
  }

  return (
    <div className="results">
      <section className="card result-hero" aria-labelledby="result-title">
        <h1 id="result-title" className="sr-only">
          Resultado del simulacro
        </h1>
        <span className="hero-label">Tu nota</span>
        <span className="hero-figure">{score.percent} %</span>
        <PassBadge passed={score.passed} />
        <p className="muted">
          El aprobado está en el {EXAM.passPercent} %: {needed} de {score.total} preguntas.
        </p>
      </section>

      <div className="kpis">
        <Stat label="Aciertos" value={`${score.correct} de ${score.total}`} />
        <Stat label="Sin contestar" value={unansweredCount} detail="cuentan como falladas" />
        <Stat label="Marcadas" value={session.flagged.length} detail="pasan a Repaso" />
        <Stat label="Tiempo usado" value={formatDuration(used)} detail={`de ${formatDuration(EXAM.durationMinutes * 60_000)}`} />
      </div>

      <SectionBars title="Acierto por sección" tallies={score.bySection} />

      <section className="card">
        <h2>Corrección</h2>
        <div className="segmented" role="radiogroup" aria-label="Qué preguntas mostrar">
          {(
            [
              ['failed', `Falladas (${failed.length})`],
              ['flagged', `Marcadas (${session.flagged.length})`],
              ['all', `Todas (${questions.length})`],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={`segment${filter === key ? ' on' : ''}`}>
              <input type="radio" name="result-filter" checked={filter === key} onChange={() => setFilter(key)} />
              {label}
            </label>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="muted">No hay preguntas en este filtro.</p>
        ) : (
          <ol className="result-list">
            {visible.map((q) => {
              const index = session.questionIds.indexOf(q.id)
              const answered = !!session.answers[q.id]?.length
              const ok = isCorrect(q, session.answers[q.id])
              const expanded = open === q.id
              return (
                <li key={q.id} className={`result-item ${ok ? 'is-right' : 'is-wrong'}`}>
                  <button type="button" className="result-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : q.id)}>
                    <span className={`result-verdict ${ok ? 'status-good' : 'status-bad'}`}>
                      {ok ? '✓ Acierto' : answered ? '✗ Fallo' : '– Sin contestar'}
                    </span>
                    <span className="result-stem">
                      {index + 1}. {q.stem}
                    </span>
                    <span className="result-chevron" aria-hidden="true">
                      {expanded ? '▴' : '▾'}
                    </span>
                  </button>
                  {expanded && (
                    <QuestionCard
                      question={q}
                      order={session.optionOrder[q.id]}
                      selected={session.answers[q.id] ?? []}
                      revealed
                      position={{ index, total: questions.length }}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="actions">
        {failed.length > 0 && (
          <button type="button" onClick={practiceFailed}>
            Practicar las {plural(failed.length, 'fallada', 'falladas')}
          </button>
        )}
        <button type="button" className="primary" onClick={() => dispatch({ type: 'exam/close' })}>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
