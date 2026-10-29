// Historial de simulacros y acierto acumulado por sección con todas las respuestas.
import type { Tally } from '../domain/grading.ts'
import type { Progress } from '../domain/storage.ts'
import type { SectionKey } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { PassBadge, Stat } from './common.tsx'
import { formatDate, formatDuration, percent } from './format.ts'
import { useI18n } from './lang.ts'
import { SectionBars } from './SectionBars.tsx'

export function History({ progress }: { progress: Progress }) {
  const { byId } = useCert()
  const { t } = useI18n()
  const exams = [...progress.history].reverse()
  const scores = progress.history.map((e) => percent(e.correct, e.total))
  const lastFive = scores.slice(-5)

  const answers: Partial<Record<SectionKey, Tally>> = {}
  for (const [id, stat] of Object.entries(progress.stats)) {
    const q = byId.get(id)
    if (!q) continue
    const tally = (answers[q.section] ??= { correct: 0, total: 0 })
    tally.correct += stat.correct
    tally.total += stat.seen
  }

  return (
    <div className="history">
      <h1>{t.history.title}</h1>
      <div className="kpis">
        <Stat label={t.history.exams} value={progress.history.length} />
        <Stat label={t.history.passed} value={progress.history.filter((e) => e.passed).length} />
        <Stat label={t.history.best} value={scores.length ? t.pct(Math.max(...scores)) : '—'} />
        <Stat
          label={t.history.recent}
          value={lastFive.length ? t.pct(Math.floor(lastFive.reduce((a, b) => a + b, 0) / lastFive.length)) : '—'}
          detail={lastFive.length ? t.history.lastN(lastFive.length) : undefined}
        />
      </div>

      <SectionBars title={t.history.barsTitle} caption={t.history.barsCaption} tallies={answers} unit="answers" />

      <section className="card">
        <h2>{t.history.exams}</h2>
        {exams.length === 0 ? (
          <p className="muted">{t.history.none}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t.history.date}</th>
                <th scope="col">{t.history.score}</th>
                <th scope="col">{t.history.hits}</th>
                <th scope="col">{t.history.time}</th>
                <th scope="col">{t.history.result}</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.startedAt}>
                  <td>{formatDate(exam.submittedAt, t.locale)}</td>
                  <td>{t.pct(percent(exam.correct, exam.total))}</td>
                  <td>{t.ofN(exam.correct, exam.total)}</td>
                  <td>{formatDuration(exam.submittedAt - exam.startedAt)}</td>
                  <td>
                    <PassBadge passed={exam.passed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
