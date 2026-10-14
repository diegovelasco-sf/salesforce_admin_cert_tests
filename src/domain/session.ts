import { EXAM } from './exam.ts'
import type { Rng } from './rng.ts'
import { sampleExam } from './sampling.ts'
import { optionOrder } from './shuffle.ts'
import type { Bank, Question, SectionKey } from './types.ts'

/**
 * Simulacro en curso. Es lo único que se reanuda tras recargar, así que guarda todo lo necesario
 * para reconstruirlo: orden de preguntas y de opciones, respuestas por clave original y hora límite.
 */
export interface ExamSession {
  bankHash: string
  seed: number
  questionIds: string[]
  optionOrder: Record<string, string[]>
  answers: Record<string, string[]>
  flagged: string[]
  current: number
  startedAt: number
  /** Hora límite absoluta (ms): el tiempo restante se recalcula siempre a partir de ella. */
  deadline: number
  submittedAt?: number
}

export function createExamSession(
  bank: Bank,
  pool: readonly Question[],
  { now, seed, rng, durationMs = EXAM.durationMinutes * 60_000 }: { now: number; seed: number; rng: Rng; durationMs?: number },
): { session: ExamSession; shortfall: SectionKey[] } {
  const { questions, shortfall } = sampleExam(pool, EXAM.questionCount, rng)
  const session: ExamSession = {
    bankHash: bank.hash,
    seed,
    questionIds: questions.map((q) => q.id),
    optionOrder: Object.fromEntries(questions.map((q) => [q.id, optionOrder(q, rng)])),
    answers: {},
    flagged: [],
    current: 0,
    startedAt: now,
    deadline: now + durationMs,
  }
  return { session, shortfall }
}

export const remainingMs = (session: ExamSession, now: number): number => Math.max(0, session.deadline - now)

export const isSubmitted = (session: ExamSession): boolean => session.submittedAt !== undefined

export function setAnswer(session: ExamSession, id: string, keys: string[]): ExamSession {
  if (isSubmitted(session)) return session
  return { ...session, answers: { ...session.answers, [id]: keys } }
}

export function toggleFlag(session: ExamSession, id: string): ExamSession {
  if (isSubmitted(session)) return session
  const flagged = session.flagged.includes(id) ? session.flagged.filter((f) => f !== id) : [...session.flagged, id]
  return { ...session, flagged }
}

export function goTo(session: ExamSession, index: number): ExamSession {
  const current = Math.min(Math.max(index, 0), session.questionIds.length - 1)
  return { ...session, current }
}

/** Entrega: si se pasa de la hora límite, cuenta como entregado en la hora límite. */
export function submit(session: ExamSession, now: number): ExamSession {
  if (isSubmitted(session)) return session
  return { ...session, submittedAt: Math.min(now, session.deadline) }
}

export const unanswered = (session: ExamSession): number =>
  session.questionIds.filter((id) => !session.answers[id]?.length).length

/**
 * Reanuda un simulacro guardado. Si ya venció, queda entregado; si alguna de sus preguntas u
 * opciones ya no existe en el banco (porque se regeneró), se descarta con un aviso.
 */
export function resumeExam(saved: ExamSession, bank: Bank, now: number): { session?: ExamSession; notice?: string } {
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  const intact = saved.questionIds.every((id) => {
    const question = byId.get(id)
    const keys = new Set(question?.options.map((o) => o.key))
    return question && saved.optionOrder[id]?.length === keys.size && saved.optionOrder[id].every((k) => keys.has(k))
  })
  if (!intact) {
    return { notice: 'El banco de preguntas ha cambiado desde que empezaste el simulacro, así que no se puede reanudar.' }
  }
  const session = { ...saved, bankHash: bank.hash }
  if (!isSubmitted(session) && now >= session.deadline) {
    return { session: submit(session, now), notice: 'El tiempo del simulacro se agotó mientras no estabas: se ha entregado.' }
  }
  return { session }
}
