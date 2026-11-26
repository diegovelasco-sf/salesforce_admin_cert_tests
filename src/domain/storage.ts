import { CERTS } from './certs.ts'
import type { Tally } from './grading.ts'
import type { ExamSession } from './session.ts'
import type { Stats } from './stats.ts'
import { PACK_SIZES, type StudyPlan } from './study.ts'
import type { CertId, SectionKey, SourceId } from './types.ts'

/** Modos con su propia elección de fuentes. */
export type SourceMode = 'practice' | 'exam' | 'review' | 'study'

export interface Settings {
  /** Deja fuera del simulacro las preguntas dudosas u obsoletas. */
  excludeDoubtful: boolean
  /** Fuentes elegidas en cada modo; si un modo no tiene, usa todas. */
  sources: Partial<Record<SourceMode, SourceId[]>>
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
  /** Notas propias por pregunta. */
  notes: Record<string, string>
  /** Paquetes del modo estudio, si ya se han creado. */
  study?: StudyPlan
  activeExam?: ExamSession
}

/** Una clave por certificación. La de Platform Administrator es la original, para no perder el progreso ya guardado. */
export const STORAGE_KEYS: Record<CertId, string> = {
  admin: 'sf-platform-admin-quiz',
  appbuilder: 'sf-platform-app-builder-quiz',
  developer: 'sf-platform-developer-quiz',
}

export const emptyProgress = (cert: CertId): Progress => ({
  schemaVersion: 1,
  cert,
  stats: {},
  flagged: [],
  history: [],
  settings: { excludeDoubtful: true, sources: {} },
  notes: {},
})

const SOURCE_MODES: readonly SourceMode[] = ['practice', 'exam', 'review', 'study']
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string')

/** Ajustes guardados, de esta versión o de antes: «solo oficiales» pasa a ser la elección de fuentes del simulacro. */
function parseSettings(raw: unknown, cert: CertId): Settings {
  const data = isObject(raw) ? raw : {}
  const sources: Settings['sources'] = {}
  if (isObject(data.sources)) {
    for (const mode of SOURCE_MODES) {
      const list = data.sources[mode]
      if (isStringArray(list)) sources[mode] = list as SourceId[]
    }
  } else if (data.officialOnly === true && CERTS[cert].officialSources.length) {
    sources.exam = [...CERTS[cert].officialSources]
  }
  return { excludeDoubtful: typeof data.excludeDoubtful === 'boolean' ? data.excludeDoubtful : true, sources }
}

function parseStudy(raw: unknown): StudyPlan | undefined {
  if (!isObject(raw)) return undefined
  const size = PACK_SIZES.find((n) => n === raw.size)
  if (!size || !Array.isArray(raw.packs) || !raw.packs.every(isStringArray)) return undefined
  return {
    size,
    ...(isStringArray(raw.sources) ? { sources: raw.sources as SourceId[] } : {}),
    ...(isStringArray(raw.sections) ? { sections: raw.sections as SectionKey[] } : {}),
    excludeDoubtful: raw.excludeDoubtful !== false,
    packs: raw.packs as string[][],
    stats: isObject(raw.stats) ? (raw.stats as Stats) : {},
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
  }
}

function parseNotes(raw: unknown): Record<string, string> {
  if (!isObject(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1].trim()))
}

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
  const study = parseStudy(data.study)
  return {
    schemaVersion: 1,
    cert,
    stats: isObject(data.stats) ? (data.stats as Stats) : empty.stats,
    flagged: Array.isArray(data.flagged) ? data.flagged.filter((f): f is string => typeof f === 'string') : empty.flagged,
    history: Array.isArray(data.history) ? (data.history as ExamRecord[]) : empty.history,
    settings: parseSettings(data.settings, cert),
    notes: parseNotes(data.notes),
    ...(study ? { study } : {}),
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
