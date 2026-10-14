import type { SectionKey, SourceId } from './types.ts'

/** Formato oficial del examen (CRT101 SU26, pág. 8). 5 de las 65 no puntúan, pero no se sabe cuáles. */
export const EXAM = {
  questionCount: 65,
  durationMinutes: 105,
  passPercent: 68,
} as const

export interface Section {
  key: SectionKey
  label: string
  weight: number
}

/** Secciones de la guía con su peso en %. El orden importa: desempata el reparto de preguntas. */
export const SECTIONS: readonly Section[] = [
  { key: 'config', label: 'Configuración y Setup', weight: 15 },
  { key: 'objects', label: 'Object Manager y Lightning App Builder', weight: 15 },
  { key: 'sales', label: 'Aplicaciones de ventas y marketing', weight: 10 },
  { key: 'service', label: 'Aplicaciones de servicio y soporte', weight: 10 },
  { key: 'productivity', label: 'Productividad y colaboración', weight: 10 },
  { key: 'data', label: 'Gestión de datos y analítica', weight: 17 },
  { key: 'automation', label: 'Automatización', weight: 15 },
  { key: 'agentforce', label: 'Agentforce IA', weight: 8 },
]

export const SECTION_KEYS: readonly SectionKey[] = SECTIONS.map((s) => s.key)

export const sectionLabel = (key: SectionKey): string => SECTIONS.find((s) => s.key === key)?.label ?? key

export const SOURCE_LABELS: Record<SourceId, string> = {
  crt101: 'Oficial · CRT101',
  adx201: 'Oficial · ADX201',
  trailhead: 'Oficial · Trailhead',
  freecram: 'FreeCram (no oficial)',
  success4exam: 'Success4Exam (no oficial)',
  debrief: 'Debrief (no oficial)',
}

export const OFFICIAL_SOURCES: readonly SourceId[] = ['crt101', 'adx201', 'trailhead']
