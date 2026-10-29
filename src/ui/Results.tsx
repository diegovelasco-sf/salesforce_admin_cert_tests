// Resultado de un simulacro entregado: nota, KPIs, acierto por sección y corrección pregunta a pregunta.
import { useState, type Dispatch } from 'react'
import { grade, isCorrect, neededToPass } from '../domain/grading.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import type { ExamSession } from '../domain/session.ts'
import { useCert } from './cert.ts'
import { PassBadge, Stat } from './common.tsx'
import { formatDuration } from './format.ts'
import { useI18n } from './lang.ts'
import { QuestionCard } from './QuestionCard.tsx'
import { SectionBars } from './SectionBars.tsx'
import { makeRun, type Action } from './state.ts'

type Filter = 'failed' | 'flagged' | 'all'

export function Results({ session, dispatch }: { session: ExamSession; dispatch: Dispatch<Action> }) {
  const [filter, setFilter] = useState<Filter>('failed')
  const [open, setOpen] = useState<string | undefined>()
  const { cert, question } = useCert()
  const { t } = useI18n()
  const { exam: rules } = cert
  const questions = session.questionIds.map(question)
  // Las de reserva se corrigen pero no puntúan: ni en la nota, ni en los fallos, ni en las sin contestar.
  const reserve = session.unscored ?? []
  const scored = questions.filter((q) => !reserve.includes(q.id))
  const score = grade(questions, session.answers, { unscored: reserve, passPercent: rules.passPercent })
  const needed = neededToPass(score.total, rules.passPercent)
  const used = (session.submittedAt ?? session.deadline) - session.startedAt
  const failed = scored.filter((q) => !isCorrect(q, session.answers[q.id]))
  const unansweredCount = scored.filter((q) => !session.answers[q.id]?.length).length
  const visible = questions.filter(
    (q) => filter === 'all' || (filter === 'failed' ? failed.includes(q) : session.flagged.includes(q.id)),
  )

  const practiceFailed = () => {
    const rng = mulberry32(randomSeed())
    dispatch({ type: 'exam/close', next: { name: 'practice', run: makeRun('exam-failed', failed, rng) } })
  }

  return (
    <div className="results">
      <section className="card result-hero" aria-labelledby="result-title">
        <h1 id="result-title" className="sr-only">
          {t.results.srTitle}
        </h1>
        <span className="hero-label">{t.results.yourScore}</span>
        <span className="hero-figure">{t.pct(score.percent)}</span>
        <PassBadge passed={score.passed} />
        <p className="muted">
          {t.results.passMark(cert.name, rules.passPercent, needed, score.total)}
          {reserve.length > 0 && t.results.reserveNote(reserve.length)}
        </p>
      </section>

      <div className="kpis">
        <Stat label={t.results.hits} value={t.ofN(score.correct, score.total)} />
        <Stat label={t.results.unanswered} value={unansweredCount} detail={t.results.unansweredDetail} />
        <Stat label={t.results.flagged} value={session.flagged.length} detail={t.results.flaggedDetail} />
        <Stat label={t.results.timeUsed} value={formatDuration(used)} detail={t.results.timeOf(formatDuration(rules.durationMinutes * 60_000))} />
      </div>

      <SectionBars title={t.results.barsTitle} tallies={score.bySection} />

      <section className="card">
        <h2>{t.results.reviewTitle}</h2>
        <div className="segmented" role="radiogroup" aria-label={t.results.filterLabel}>
          {(
            [
              ['failed', t.results.filterFailed(failed.length)],
              ['flagged', t.results.filterFlagged(session.flagged.length)],
              ['all', t.results.filterAll(questions.length)],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={`segment${filter === key ? ' on' : ''}`}>
              <input type="radio" name="result-filter" checked={filter === key} onChange={() => setFilter(key)} />
              {label}
            </label>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="muted">{t.results.emptyFilter}</p>
        ) : (
          <ol className="result-list">
            {visible.map((q) => {
              const index = session.questionIds.indexOf(q.id)
              const answered = !!session.answers[q.id]?.length
              const ok = isCorrect(q, session.answers[q.id])
              const isReserve = reserve.includes(q.id)
              const expanded = open === q.id
              return (
                <li key={q.id} className={`result-item ${ok ? 'is-right' : 'is-wrong'}`}>
                  <button type="button" className="result-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : q.id)}>
                    <span className={`result-verdict ${ok ? 'status-good' : 'status-bad'}`}>
                      {ok ? t.results.right : answered ? t.results.wrong : t.results.skipped}
                      {isReserve && <span className="muted">{t.results.reserveTag}</span>}
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
            {t.results.practiceFailed(failed.length)}
          </button>
        )}
        <button type="button" className="primary" onClick={() => dispatch({ type: 'exam/close' })}>
          {t.backHome}
        </button>
      </div>
    </div>
  )
}
