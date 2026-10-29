// Solo en desarrollo: ?demo=practice|exam|results|history carga un progreso de ejemplo y abre esa
// pantalla, para revisar el diseño sin tener que hacer un simulacro entero. Sobrescribe el progreso
// guardado de la certificación con la que se abre la app, y de ninguna otra.
import { isCorrect } from '../domain/grading.ts'
import { mulberry32, type Rng } from '../domain/rng.ts'
import { createExamSession, setAnswer, submit, toggleFlag, type ExamSession } from '../domain/session.ts'
import { recordAnswer } from '../domain/stats.ts'
import { emptyProgress, saveProgress, type Progress } from '../domain/storage.ts'
import type { Question } from '../domain/types.ts'
import type { CertData } from './certdata.ts'
import { finalizeExam, makeRun, type Screen } from './state.ts'

const DEMOS = ['practice', 'exam', 'results', 'history'] as const
type Demo = (typeof DEMOS)[number]

const MINUTE = 60_000

/** Respuesta de ejemplo: la correcta con probabilidad `skill`; si no, otra opción. */
function answerFor(q: Question, rng: Rng, skill: number): string[] {
  if (rng() < skill) return [...q.correct]
  const wrong = q.options.map((o) => o.key).filter((k) => !q.correct.includes(k))
  return [...q.correct.slice(1), wrong[Math.floor(rng() * wrong.length)]].slice(0, q.correct.length)
}

function demoExam({ cert, bank, byId }: CertData, rng: Rng, start: number, skill: number, answered: number): ExamSession {
  let { session } = createExamSession(bank, cert, bank.questions, { now: start, seed: 1, rng })
  session.questionIds.slice(0, answered).forEach((id, i) => {
    session = setAnswer(session, id, answerFor(byId.get(id)!, rng, skill))
    if (i % 17 === 3) session = toggleFlag(session, id)
  })
  return session
}

export function seedDemo(storage: Storage, data: CertData, demo: string | null): Screen | undefined {
  if (!DEMOS.includes(demo as Demo)) return undefined
  const { cert, bank, byId } = data
  if (bank.questions.length === 0) return undefined
  const full = cert.exam.questionCount
  const rng = mulberry32(2026)
  const now = Date.now()
  let progress: Progress = emptyProgress(cert.id)

  // Práctica previa: unas 120 respuestas con un acierto que mejora con el tiempo.
  bank.questions.slice(0, 120).forEach((q, i) => {
    const ok = isCorrect(q, answerFor(q, rng, 0.45 + i / 400))
    progress = { ...progress, stats: recordAnswer(progress.stats, q.id, ok, now - (120 - i) * MINUTE) }
  })
  // Tres simulacros anteriores: suspenso, suspenso por poco y aprobado.
  ;[0.55, 0.64, 0.74].forEach((skill, i) => {
    const start = now - (10 - i * 3) * 24 * 60 * MINUTE
    progress = finalizeExam(progress, submit(demoExam(data, rng, start, skill, full), start + (95 - i * 10) * MINUTE), data)
  })
  progress = { ...progress, activeExam: undefined }

  let screen: Screen = { name: 'history' }
  if (demo === 'exam') {
    progress = { ...progress, activeExam: { ...demoExam(data, rng, now - 31 * MINUTE, 0.7, 23), current: 22 } }
    screen = { name: 'exam' }
  } else if (demo === 'results') {
    const start = now - 98 * MINUTE
    progress = finalizeExam(progress, submit(demoExam(data, rng, start, 0.7, full - 3), start + 96 * MINUTE), data)
    screen = { name: 'results' }
  } else if (demo === 'practice') {
    const run = makeRun('practice', bank.questions.filter((q) => q.correct.length > 1).slice(0, 10), rng)
    const [first] = run.questionIds
    run.selected[first] = answerFor(byId.get(first)!, mulberry32(1), 0)
    run.checked.push(first)
    screen = { name: 'practice', run }
  }
  saveProgress(storage, progress)
  return screen
}
