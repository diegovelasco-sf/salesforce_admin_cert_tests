import type { SectionKey, SourceId } from './types.ts'

/**
 * Formato oficial del examen (CRT101 SU26, pág. 8): 65 preguntas, de las que 60 puntúan y 5 son de
 * reserva. En el examen no se sabe cuáles; el simulacro las elige al azar y las revela al entregar.
 */
export const EXAM = {
  questionCount: 65,
  scoredCount: 60,
  durationMinutes: 105,
  passPercent: 68,
} as const

export interface Section {
  key: SectionKey
  label: string
  /** Nombre en inglés, tal como sale en la guía. */
  labelEn: string
  weight: number
}

/** Secciones de la guía con su peso en %. El orden importa: desempata el reparto de preguntas. */
export const SECTIONS: readonly Section[] = [
  { key: 'config', label: 'Configuración y Setup', labelEn: 'Configuration & Setup', weight: 15 },
  { key: 'objects', label: 'Object Manager y Lightning App Builder', labelEn: 'Object Manager & Lightning App Builder', weight: 15 },
  { key: 'sales', label: 'Aplicaciones de ventas y marketing', labelEn: 'Sales & Marketing', weight: 10 },
  { key: 'service', label: 'Aplicaciones de servicio y soporte', labelEn: 'Service & Support', weight: 10 },
  { key: 'productivity', label: 'Productividad y colaboración', labelEn: 'Productivity & Collaboration', weight: 10 },
  { key: 'data', label: 'Gestión de datos y analítica', labelEn: 'Data & Analytics', weight: 17 },
  { key: 'automation', label: 'Automatización', labelEn: 'Automation', weight: 15 },
  { key: 'agentforce', label: 'Agentforce IA', labelEn: 'Agentforce AI', weight: 8 },
]

export const SECTION_KEYS: readonly SectionKey[] = SECTIONS.map((s) => s.key)

export const SOURCE_LABELS: Record<SourceId, string> = {
  crt101: 'Oficial · CRT101',
  adx201: 'Oficial · ADX201',
  trailhead: 'Oficial · Trailhead',
  freecram: 'FreeCram (no oficial)',
  success4exam: 'Success4Exam (no oficial)',
  debrief: 'Debrief (no oficial)',
  abv2335: 'FreeCram V23.35 (no oficial)',
  abs4e: 'Success4Exam demo (no oficial)',
  abfc143: 'FreeCram v2026-06-30 (no oficial)',
  abfc108: 'FreeCram v2026-09-05 (no oficial)',
  abfc35: 'FreeCram sin fecha (no oficial)',
}

export const OFFICIAL_SOURCES: readonly SourceId[] = ['crt101', 'adx201', 'trailhead']
