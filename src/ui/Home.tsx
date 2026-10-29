// Inicio: avisos, simulacro a medias, los tres modos y un resumen del progreso.
import { useState, type Dispatch } from 'react'
import { neededToPass } from '../domain/grading.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { filterPool } from '../domain/sampling.ts'
import { createExamSession, isSubmitted, remainingMs } from '../domain/session.ts'
import { inReview } from '../domain/stats.ts'
import type { Progress } from '../domain/storage.ts'
import { useCert } from './cert.ts'
import { ConfirmDialog, Stat } from './common.tsx'
import { formatDuration, percent } from './format.ts'
import { useI18n } from './lang.ts'
import { sectionName } from './messages.ts'
import { makeRun, type Action, type Notice } from './state.ts'
import { useNow } from './useNow.ts'

/** En desarrollo, ?min=N acorta el simulacro a N minutos para probar la entrega automática. */
function examDurationMs(defaultMinutes: number): number {
  const minutes = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('min')) : 0
  return (minutes > 0 ? minutes : defaultMinutes) * 60_000
}

export function Home({ progress, notices, dispatch }: { progress: Progress; notices: Notice[]; dispatch: Dispatch<Action> }) {
  const { cert, bank } = useCert()
  const { t, lang } = useI18n()
  const { exam: rules } = cert
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const now = useNow()
  const exam = progress.activeExam && !isSubmitted(progress.activeExam) ? progress.activeExam : undefined
  const reviewQuestions = bank.questions.filter((q) => inReview(progress.stats[q.id], progress.flagged.includes(q.id)))
  const seen = bank.questions.filter((q) => progress.stats[q.id]).length
  const totals = Object.values(progress.stats).reduce((acc, s) => ({ correct: acc.correct + s.correct, seen: acc.seen + s.seen }), {
    correct: 0,
    seen: 0,
  })
  const lastExam = progress.history.at(-1)
  const needed = neededToPass(rules.scoredCount, rules.passPercent)

  const startExam = () => {
    const seed = randomSeed()
    const pool = filterPool(bank.questions, cert, progress.settings)
    const { session, shortfall } = createExamSession(bank, cert, pool, {
      now: Date.now(),
      seed,
      rng: mulberry32(seed),
      durationMs: examDurationMs(rules.durationMinutes),
    })
    const notices: Notice[] = []
    if (session.questionIds.length < rules.questionCount) notices.push({ kind: 'short-exam', available: session.questionIds.length })
    if (shortfall.length > 0) notices.push({ kind: 'shortfall', sections: shortfall })
    dispatch({ type: 'exam/start', session, notices })
  }

  const startReview = () => {
    const rng = mulberry32(randomSeed())
    dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('review', reviewQuestions, rng) } })
  }

  return (
    <div className="home">
      {notices.map((notice, index) => (
        <div key={`${index}-${notice.kind}`} className="notice" role="status">
          <span>{t.notice(notice, (key) => sectionName(cert, key, lang))}</span>
          <button type="button" className="link-button" onClick={() => dispatch({ type: 'notice/dismiss', index })}>
            {t.close}
          </button>
        </div>
      ))}

      {exam && (
        <section className="card resume" aria-label={t.home.resumeLabel}>
          <div>
            <h2>{t.home.resumeTitle}</h2>
            <p className="muted">{t.home.resumeText(formatDuration(remainingMs(exam, now)), Object.keys(exam.answers).length, exam.questionIds.length)}</p>
          </div>
          <div className="actions">
            <button type="button" className="danger" onClick={() => setConfirmDiscard(true)}>
              {t.home.discard}
            </button>
            <button type="button" className="primary" onClick={() => dispatch({ type: 'navigate', screen: { name: 'exam' } })}>
              {t.home.resume}
            </button>
          </div>
        </section>
      )}

      <div className="modes">
        <section className="card mode">
          <h2>{t.home.practiceTitle}</h2>
          <p>{t.home.practiceText}</p>
          <button type="button" className="primary" onClick={() => dispatch({ type: 'navigate', screen: { name: 'practice-setup' } })}>
            {t.home.practiceButton}
          </button>
        </section>
        <section className="card mode">
          <h2>{t.home.examTitle}</h2>
          <p>{t.home.examText(rules, needed)}</p>
          <button type="button" className="primary" disabled={!!exam} onClick={startExam}>
            {exam ? t.home.examBlocked : t.home.examButton}
          </button>
        </section>
        <section className="card mode">
          <h2>{t.home.reviewTitle}</h2>
          <p>{t.home.reviewText(reviewQuestions.length)}</p>
          <button type="button" className="primary" disabled={!reviewQuestions.length} onClick={startReview}>
            {t.home.reviewButton}
          </button>
        </section>
      </div>

      <section aria-label={t.home.progressLabel}>
        <div className="kpis">
          <Stat label={t.home.seen} value={t.ofN(seen, bank.questions.length)} />
          <Stat
            label={t.home.globalHit}
            value={totals.seen ? t.pct(percent(totals.correct, totals.seen)) : '—'}
            detail={totals.seen ? t.home.answers(totals.seen) : undefined}
          />
          <Stat label={t.home.inReview} value={reviewQuestions.length} />
          <Stat
            label={t.home.lastExam}
            value={lastExam ? t.pct(percent(lastExam.correct, lastExam.total)) : '—'}
            detail={lastExam ? (lastExam.passed ? t.home.lastPassed : t.home.lastFailed) : undefined}
          />
        </div>
      </section>

      <ConfirmDialog
        open={confirmDiscard}
        title={t.home.discardTitle}
        confirmLabel={t.home.discard}
        danger
        onConfirm={() => {
          setConfirmDiscard(false)
          dispatch({ type: 'exam/close' })
        }}
        onCancel={() => setConfirmDiscard(false)}
      >
        <p>{t.home.discardBody}</p>
      </ConfirmDialog>
    </div>
  )
}
