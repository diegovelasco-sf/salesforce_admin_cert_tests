// Historial de simulacros y acierto acumulado por sección con todas las respuestas.
import type { Tally } from '../domain/grading.ts'
import type { Progress } from '../domain/storage.ts'
import type { SectionKey } from '../domain/types.ts'
import { QUESTIONS_BY_ID } from './bank.ts'
import { PassBadge, Stat } from './common.tsx'
import { formatDate, formatDuration, percent } from './format.ts'
import { SectionBars } from './SectionBars.tsx'

export function History({ progress }: { progress: Progress }) {
  const exams = [...progress.history].reverse()
  const scores = progress.history.map((e) => percent(e.correct, e.total))
  const lastFive = scores.slice(-5)

  const answers: Partial<Record<SectionKey, Tally>> = {}
  for (const [id, stat] of Object.entries(progress.stats)) {
    const q = QUESTIONS_BY_ID.get(id)
    if (!q) continue
    const tally = (answers[q.section] ??= { correct: 0, total: 0 })
    tally.correct += stat.correct
    tally.total += stat.seen
  }

  return (
    <div className="history">
      <h1>Historial</h1>
      <div className="kpis">
        <Stat label="Simulacros" value={progress.history.length} />
        <Stat label="Aprobados" value={progress.history.filter((e) => e.passed).length} />
        <Stat label="Mejor nota" value={scores.length ? `${Math.max(...scores)} %` : '—'} />
        <Stat
          label="Media reciente"
          value={lastFive.length ? `${Math.floor(lastFive.reduce((a, b) => a + b, 0) / lastFive.length)} %` : '—'}
          detail={lastFive.length ? `últimos ${lastFive.length}` : undefined}
        />
      </div>

      <SectionBars
        title="Acierto acumulado por sección"
        caption="Todas tus respuestas en práctica, repaso y simulacros."
        tallies={answers}
        unit="respuestas"
      />

      <section className="card">
        <h2>Simulacros</h2>
        {exams.length === 0 ? (
          <p className="muted">Aún no has hecho ningún simulacro.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Nota</th>
                <th scope="col">Aciertos</th>
                <th scope="col">Tiempo</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.startedAt}>
                  <td>{formatDate(exam.submittedAt)}</td>
                  <td>{percent(exam.correct, exam.total)} %</td>
                  <td>
                    {exam.correct} de {exam.total}
                  </td>
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
