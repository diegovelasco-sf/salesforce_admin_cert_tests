import type { Tally } from './grading.ts'
import type { ExamSession } from './session.ts'
import type { Stats } from './stats.ts'
import type { CertId, SectionKey } from './types.ts'

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
  /** Certificación a la que pertenece. Un progreso nunca se carga en otra. */
  cert: CertId
  stats: Stats
  /** Preguntas marcadas para repasar. */
  flagged: string[]
  history: ExamRecord[]
  settings: Settings
  activeExam?: ExamSession
}

/** Una clave por certificación. La de Platform Administrator es la original, para no perder el progreso ya guardado. */
export const STORAGE_KEYS: Record<CertId, string> = {
  admin: 'sf-platform-admin-quiz',
  appbuilder: 'sf-platform-app-builder-quiz',
}

export const emptyProgress = (cert: CertId): Progress => ({
  schemaVersion: 1,
  cert,
  stats: {},
  flagged: [],
  history: [],
  settings: { excludeDoubtful: true, officialOnly: false },
})

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Valida la forma general y completa lo que falte. Lanza si no parece un progreso de esta app o si es
 * de otra certificación. Los progresos sin campo `cert` son anteriores a las certificaciones: son de Platform Administrator.
 */
export function parseProgress(text: string, cert: CertId): Progress {
  const data: unknown = JSON.parse(text)
  if (!isObject(data)) throw new Error('El contenido no es un objeto JSON.')
  if (data.schemaVersion !== 1) throw new Error(`Versión de datos desconocida: ${String(data.schemaVersion)}.`)
  const owner = typeof data.cert === 'string' ? data.cert : 'admin'
  if (owner !== cert) throw new Error('Este progreso es de otra certificación, no de la que estás usando.')
  const empty = emptyProgress(cert)
  return {
    schemaVersion: 1,
    cert,
    stats: isObject(data.stats) ? (data.stats as Stats) : empty.stats,
    flagged: Array.isArray(data.flagged) ? data.flagged.filter((f): f is string => typeof f === 'string') : empty.flagged,
    history: Array.isArray(data.history) ? (data.history as ExamRecord[]) : empty.history,
    settings: { ...empty.settings, ...(isObject(data.settings) ? data.settings : {}) },
    activeExam: isObject(data.activeExam) ? (data.activeExam as unknown as ExamSession) : undefined,
  }
}

/**
 * Lee el progreso de una certificación. Si está corrupto, es de una versión desconocida o de otra
 * certificación, guarda una copia de seguridad con otra clave y empieza de cero, en vez de romper la app.
 */
export function loadProgress(storage: Storage, cert: CertId, now = Date.now()): { progress: Progress; backupKey?: string } {
  const key = STORAGE_KEYS[cert]
  const raw = storage.getItem(key)
  if (raw === null) return { progress: emptyProgress(cert) }
  try {
    return { progress: parseProgress(raw, cert) }
  } catch {
    const backupKey = `${key}.backup-${now}`
    storage.setItem(backupKey, raw)
    storage.removeItem(key)
    return { progress: emptyProgress(cert), backupKey }
  }
}

export function saveProgress(storage: Storage, progress: Progress): void {
  storage.setItem(STORAGE_KEYS[progress.cert], JSON.stringify(progress))
}

export const exportProgress = (progress: Progress): string => JSON.stringify(progress, null, 2)
