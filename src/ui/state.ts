// Estado de la app: progreso guardado + pantalla actual. Reducer puro, sin efectos.
import { grade, isCorrect } from '../domain/grading.ts'
import type { Rng } from '../domain/rng.ts'
import { goTo, isSubmitted, resumeExam, setAnswer, submit, toggleFlag, type ExamSession } from '../domain/session.ts'
import { optionOrder } from '../domain/shuffle.ts'
import { recordAnswer } from '../domain/stats.ts'
import type { ExamRecord, Progress, Settings } from '../domain/storage.ts'
import type { Question, SectionKey } from '../domain/types.ts'
import type { CertData } from './certdata.ts'

/** Tipo de tanda de práctica. El texto se pone en el idioma activo al mostrarla. */
export type RunKind = 'practice' | 'review' | 'failed' | 'exam-failed'

/** Aviso de la app. Son datos, no texto: se traducen al mostrarlos (ver messages.ts). */
export type Notice =
  | { kind: 'backup'; key: string }
  | { kind: 'expired' }
  | { kind: 'bank-changed' }
  | { kind: 'imported' }
  | { kind: 'reset' }
  | { kind: 'short-exam'; available: number }
  | { kind: 'shortfall'; sections: SectionKey[] }

/** Una tanda de práctica o repaso. No se guarda: cada respuesta comprobada va directa a las estadísticas. */
export interface PracticeRun {
  kind: RunKind
  questionIds: string[]
  optionOrder: Record<string, string[]>
  index: number
  selected: Record<string, string[]>
  checked: string[]
}

export type Screen =
  | { name: 'home' }
  | { name: 'practice-setup' }
  | { name: 'practice'; run: PracticeRun }
  | { name: 'exam' }
  | { name: 'results' }
  | { name: 'history' }
  | { name: 'settings' }

export interface AppState {
  progress: Progress
  screen: Screen
  notices: Notice[]
}

export type Action =
  | { type: 'navigate'; screen: Screen }
  | { type: 'practice/select'; id: string; keys: string[] }
  | { type: 'practice/check'; id: string; now: number }
  | { type: 'practice/goto'; index: number }
  | { type: 'flag/toggle'; id: string }
  | { type: 'exam/start'; session: ExamSession; notices?: Notice[] }
  | { type: 'exam/answer'; id: string; keys: string[] }
  | { type: 'exam/flag'; id: string }
  | { type: 'exam/goto'; index: number }
  | { type: 'exam/submit'; now: number }
  | { type: 'exam/close'; next?: Screen }
  | { type: 'settings/update'; settings: Partial<Settings> }
  | { type: 'progress/replace'; progress: Progress; notice?: Notice }
  | { type: 'notice/dismiss'; index: number }

export function makeRun(kind: RunKind, questions: readonly Question[], rng: Rng): PracticeRun {
  return {
    kind,
    questionIds: questions.map((q) => q.id),
    optionOrder: Object.fromEntries(questions.map((q) => [q.id, optionOrder(q, rng)])),
    index: 0,
    selected: {},
    checked: [],
  }
}

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])]

/**
 * Cierra un simulacro recién entregado: lo añade al historial, pasa sus respuestas a las
 * estadísticas (las no contestadas no cuentan como vistas) y sus marcas a Repaso.
 */
export function finalizeExam(progress: Progress, session: ExamSession, { cert, byId }: CertData): Progress {
  const at = session.submittedAt ?? session.deadline
  const questions = session.questionIds.flatMap((id) => byId.get(id) ?? [])
  const score = grade(questions, session.answers, { unscored: session.unscored, passPercent: cert.exam.passPercent })
  let stats = progress.stats
  for (const question of questions) {
    const answer = session.answers[question.id]
    if (answer?.length) stats = recordAnswer(stats, question.id, isCorrect(question, answer), at)
  }
  const record: ExamRecord = {
    startedAt: session.startedAt,
    submittedAt: at,
    correct: score.correct,
    total: score.total,
    passed: score.passed,
    bySection: score.bySection,
  }
  return { ...progress, stats, flagged: union(progress.flagged, session.flagged), history: [...progress.history, record], activeExam: session }
}

/** Estado inicial: reanuda o entrega el simulacro guardado, o lo descarta si el banco cambió. */
export function initState(data: CertData, loaded: { progress: Progress; backupKey?: string }, now: number): AppState {
  const notices: Notice[] = []
  if (loaded.backupKey) notices.push({ kind: 'backup', key: loaded.backupKey })
  let progress = loaded.progress
  let screen: Screen = { name: 'home' }
  const saved = progress.activeExam
  if (saved) {
    const { session } = resumeExam(saved, data.bank, now)
    // Mismas condiciones que el aviso de resumeExam, pero como dato y no como texto.
    const expired = !!session && !isSubmitted(saved) && isSubmitted(session)
    if (!session) notices.push({ kind: 'bank-changed' })
    if (expired) notices.push({ kind: 'expired' })
    if (!session) progress = { ...progress, activeExam: undefined }
    else if (expired) progress = finalizeExam(progress, session, data)
    else progress = { ...progress, activeExam: session }
    if (session && isSubmitted(session)) screen = { name: 'results' }
  }
  return { progress, screen, notices }
}

export function createReducer(data: CertData) {
  const { byId } = data
  return function reducer(state: AppState, action: Action): AppState {
    const { progress, screen } = state
    const exam = progress.activeExam
    const withExam = (session: ExamSession): AppState => ({ ...state, progress: { ...progress, activeExam: session } })
    const withRun = (run: PracticeRun): AppState => ({ ...state, screen: { name: 'practice', run } })

    switch (action.type) {
      case 'navigate':
        return { ...state, screen: action.screen }

      case 'practice/select': {
        if (screen.name !== 'practice' || screen.run.checked.includes(action.id)) return state
        return withRun({ ...screen.run, selected: { ...screen.run.selected, [action.id]: action.keys } })
      }
      case 'practice/check': {
        const question = byId.get(action.id)
        if (screen.name !== 'practice' || !question || screen.run.checked.includes(action.id)) return state
        const ok = isCorrect(question, screen.run.selected[action.id])
        return {
          ...state,
          progress: { ...progress, stats: recordAnswer(progress.stats, action.id, ok, action.now) },
          screen: { name: 'practice', run: { ...screen.run, checked: [...screen.run.checked, action.id] } },
        }
      }
      case 'practice/goto': {
        if (screen.name !== 'practice') return state
        const index = Math.min(Math.max(action.index, 0), screen.run.questionIds.length - 1)
        return withRun({ ...screen.run, index })
      }
      case 'flag/toggle': {
        const flagged = progress.flagged.includes(action.id)
          ? progress.flagged.filter((id) => id !== action.id)
          : [...progress.flagged, action.id]
        return { ...state, progress: { ...progress, flagged } }
      }

      case 'exam/start':
        return {
          ...state,
          progress: { ...progress, activeExam: action.session },
          screen: { name: 'exam' },
          notices: [...state.notices, ...(action.notices ?? [])],
        }
      case 'exam/answer':
        return exam ? withExam(setAnswer(exam, action.id, action.keys)) : state
      case 'exam/flag':
        return exam ? withExam(toggleFlag(exam, action.id)) : state
      case 'exam/goto':
        return exam ? withExam(goTo(exam, action.index)) : state
      case 'exam/submit': {
        if (!exam || isSubmitted(exam)) return state
        return { ...state, progress: finalizeExam(progress, submit(exam, action.now), data), screen: { name: 'results' } }
      }
      case 'exam/close':
        return { ...state, progress: { ...progress, activeExam: undefined }, screen: action.next ?? { name: 'home' } }

      case 'settings/update':
        return { ...state, progress: { ...progress, settings: { ...progress.settings, ...action.settings } } }
      case 'progress/replace':
        return {
          progress: action.progress,
          screen: { name: 'home' },
          notices: action.notice ? [...state.notices, action.notice] : state.notices,
        }
      case 'notice/dismiss':
        return { ...state, notices: state.notices.filter((_, i) => i !== action.index) }
    }
  }
}
