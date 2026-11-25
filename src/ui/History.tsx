// Progreso: resumen, evolución de los simulacros, secciones flojas, acierto por sección e historial.
import type { Dispatch } from 'react'
import type { Tally } from '../domain/grading.ts'
import { inReview } from '../domain/stats.ts'
import type { Progress } from '../domain/storage.ts'
import { packProgress, studyState } from '../domain/study.ts'
import type { SectionKey } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { PassBadge, Stat } from './common.tsx'
import { formatDate, formatDuration, percent } from './format.ts'
import { useI18n } from './lang.ts'
import { sectionName } from './messages.ts'
import { SectionBars } from './SectionBars.tsx'
import type { Action } from './state.ts'
import { ScoreTrend } from './ScoreTrend.tsx'

export function History({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const { cert, bank, byId } = useCert()
  const { t, lang } = useI18n()
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

  const seen = bank.questions.filter((q) => progress.stats[q.id]).length
  const mastered = bank.questions.filter((q) => progress.stats[q.id] && studyState(progress.stats[q.id]) === 'mastered').length
  const reviewCount = bank.questions.filter((q) => inReview(progress.stats[q.id], progress.flagged.includes(q.id))).length
  const plan = progress.study
  const packsDone = plan ? plan.packs.filter((p) => { const pp = packProgress(p, plan.stats); return pp.mastered === pp.total }).length : 0
  // Las tres secciones con menos acierto (con al menos 5 respuestas, para no fiarse de una sola).
  const weak = cert.sections
    .map((s) => ({ section: s, tally: answers[s.key] }))
    .filter(({ tally }) => tally && tally.total >= 5)
    .sort((a, b) => percent(a.tally!.correct, a.tally!.total) - percent(b.tally!.correct, b.tally!.total))
    .slice(0, 3)

  return (
    <div className="history">
      <h1>{t.history.title}</h1>
      <section aria-label={t.history.overview}>
        <div className="kpis">
          <Stat label={t.history.seen} value={t.ofN(seen, bank.questions.length)} />
          <Stat label={t.history.mastered} value={mastered} detail={t.history.masteredDetail} />
          <Stat label={t.history.inReview} value={reviewCount} />
          {plan && <Stat label={t.history.studyPacks} value={t.ofN(packsDone, plan.packs.length)} />}
        </div>
      </section>

      {progress.history.length > 0 && <ScoreTrend history={progress.history} />}

      <section className="card">
        <h2>{t.history.weakTitle}</h2>
        {weak.length === 0 ? (
          <p className="muted">{t.history.weakEmpty}</p>
        ) : (
          <>
            <p className="muted">{t.history.weakText}</p>
            <ul className="weak-list">
              {weak.map(({ section, tally }) => (
                <li key={section.key}>
                  <span>
                    <strong>{sectionName(cert, section.key, lang)}</strong>{' '}
                    <span className="muted">
                      {t.pct(percent(tally!.correct, tally!.total))} · {t.ofN(tally!.correct, tally!.total)}
                    </span>
                  </span>
                  <button type="button" onClick={() => dispatch({ type: 'navigate', screen: { name: 'practice-setup', sections: [section.key] } })}>
                    {t.history.practiceSection}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

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
