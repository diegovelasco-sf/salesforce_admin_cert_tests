import type { Tally } from './grading.ts'
import type { ExamSession } from './session.ts'
import type { Stats } from './stats.ts'
import type { SectionKey } from './types.ts'

export interface Settings {
  /** Deja fuera del simulacro las preguntas dudosas u obsoletas. */
  excludeDoubtful: boolean
  officialOnly: boolean
}

export interface ExamRecord {
  startedAt: number
  submittedAt: number
  correct: number
  total: number
  passed: boolean
  bySection: Partial<Record<SectionKey, Tally>>
}

export interface Progress {
  schemaVersion: 1
  stats: Stats
  /** Preguntas marcadas para repasar. */
  flagged: string[]
  history: ExamRecord[]
  settings: Settings
  activeExam?: ExamSession
}

export const STORAGE_KEY = 'sf-platform-admin-quiz'

export const emptyProgress = (): Progress => ({
  schemaVersion: 1,
  stats: {},
  flagged: [],
  history: [],
  settings: { excludeDoubtful: true, officialOnly: false },
})

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Valida la forma general y completa lo que falte. Lanza si no parece un progreso de esta app. */
export function parseProgress(text: string): Progress {
  const data: unknown = JSON.parse(text)
  if (!isObject(data)) throw new Error('El contenido no es un objeto JSON.')
  if (data.schemaVersion !== 1) throw new Error(`Versión de datos desconocida: ${String(data.schemaVersion)}.`)
  const empty = emptyProgress()
  return {
    schemaVersion: 1,
    stats: isObject(data.stats) ? (data.stats as Stats) : empty.stats,
    flagged: Array.isArray(data.flagged) ? data.flagged.filter((f): f is string => typeof f === 'string') : empty.flagged,
    history: Array.isArray(data.history) ? (data.history as ExamRecord[]) : empty.history,
    settings: { ...empty.settings, ...(isObject(data.settings) ? data.settings : {}) },
    activeExam: isObject(data.activeExam) ? (data.activeExam as unknown as ExamSession) : undefined,
  }
}

/**
 * Lee el progreso. Si está corrupto o es de una versión desconocida, guarda una copia de seguridad
 * con otra clave y empieza de cero, en vez de romper la app.
 */
export function loadProgress(storage: Storage, now = Date.now()): { progress: Progress; backupKey?: string } {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return { progress: emptyProgress() }
  try {
    return { progress: parseProgress(raw) }
  } catch {
    const backupKey = `${STORAGE_KEY}.backup-${now}`
    storage.setItem(backupKey, raw)
    storage.removeItem(STORAGE_KEY)
    return { progress: emptyProgress(), backupKey }
  }
}

export function saveProgress(storage: Storage, progress: Progress): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export const exportProgress = (progress: Progress): string => JSON.stringify(progress, null, 2)
