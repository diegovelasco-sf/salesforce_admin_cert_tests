// Modo estudio: las preguntas elegidas (por secciones y fuentes) se reparten una vez en paquetes fijos (30 o
// 60 preguntas) que no se solapan, todos con la misma mezcla de secciones, para repetirlos hasta memorizarlos.
// Una certificación puede tener varios grupos de paquetes (planes), cada uno con sus filtros y su dominio.
import type { CertConfig } from './certs.ts'
import type { Rng } from './rng.ts'
import { shuffle } from './shuffle.ts'
import { REVIEW_STREAK, type QuestionStat, type Stats } from './stats.ts'
import type { Question, SectionKey, SourceId } from './types.ts'

export const PACK_SIZES = [30, 60] as const
export type PackSize = (typeof PACK_SIZES)[number]

/** Grupo de paquetes de estudio: sus filtros y qué preguntas tiene cada paquete. Se guarda con el progreso. */
export interface StudyPlan {
  /** Estable: lo usan las tandas para saber a qué plan pertenecen. */
  id: string
  size: PackSize
  /** Fuentes con las que se creó; sin indicar, todas. */
  sources?: SourceId[]
  /** Secciones con las que se creó; sin indicar, todas. */
  sections?: SectionKey[]
  excludeDoubtful: boolean
  /** Ids de cada paquete. El último puede ir llenándose con las preguntas que se añadan al banco. */
  packs: string[][]
  /** Respuestas dadas en el estudio, aparte de las globales: el dominio de un paquete solo cuenta lo estudiado en él. */
  stats: Stats
  createdAt: number
}

/**
 * Reparte `questions` en paquetes de unas `size` preguntas: tantos paquetes como quepan enteros, y el
 * resto se reparte entre ellos (302 preguntas en paquetes de 30 son 10 paquetes de 30 o 31). Cada sección se baraja y se reparte por turnos
 * entre todos los paquetes, así que todos llevan la misma mezcla de secciones (la del banco, que se
 * parece a la del examen) y sus tamaños difieren como mucho en una pregunta. Las secciones se reparten
 * de mayor a menor peso en el examen, y cada una empieza donde acabó la anterior, para que los
 * paquetes más cortos no sean siempre los mismos.
 */
export function buildPacks(questions: readonly Question[], cert: CertConfig, size: PackSize, rng: Rng): string[][] {
  if (!questions.length) return []
  const count = Math.max(1, Math.round(questions.length / size))
  const packs: string[][] = Array.from({ length: count }, () => [])
  const order = [...cert.sections].sort((a, b) => b.weight - a.weight)
  let next = 0
  for (const section of order) {
    for (const q of shuffle(questions.filter((q) => q.section === section.key), rng)) {
      packs[next].push(q.id)
      next = (next + 1) % count
    }
  }
  // Preguntas de secciones que la certificación ya no tiene: no deberían existir, pero no se pierden.
  const known = new Set(cert.sections.map((s) => s.key))
  for (const q of questions.filter((q) => !known.has(q.section))) {
    packs[next].push(q.id)
    next = (next + 1) % count
  }
  return packs.map((pack) => shuffle(pack, rng))
}

/**
 * Pone el plan al día con el banco actual sin mover ninguna pregunta de paquete: quita las que ya no
 * están en `pool` y añade las nuevas al último paquete, abriendo otro cuando se llena.
 */
export function syncPlan(plan: StudyPlan, pool: readonly Question[]): StudyPlan {
  const ids = new Set(pool.map((q) => q.id))
  const packs = plan.packs.map((pack) => pack.filter((id) => ids.has(id))).filter((pack) => pack.length > 0)
  const placed = new Set(packs.flat())
  const fresh = pool.filter((q) => !placed.has(q.id)).map((q) => q.id)
  if (!fresh.length && packs.length === plan.packs.length && packs.every((p, i) => p.length === plan.packs[i].length)) return plan
  // Las nuevas rellenan el último paquete si es de los cortos; si no, abren uno nuevo.
  for (const id of fresh) {
    const last = packs.at(-1)
    if (last && last.length < plan.size) last.push(id)
    else packs.push([id])
  }
  return { ...plan, packs }
}

/** Estado de una pregunta en el estudio. */
export type StudyState = 'new' | 'learning' | 'mastered'

/**
 * new: aún no se ha respondido en el estudio · learning: se ha fallado alguna vez y todavía no se ha
 * acertado dos veces seguidas (es una «fallada» del paquete) · mastered: dominada.
 */
export function studyState(stat: QuestionStat | undefined): StudyState {
  if (!stat?.seen) return 'new'
  return stat.correct < stat.seen && stat.streak < REVIEW_STREAK ? 'learning' : 'mastered'
}

export interface PackProgress {
  total: number
  new: number
  learning: number
  mastered: number
}

export function packProgress(pack: readonly string[], stats: Stats): PackProgress {
  const progress: PackProgress = { total: pack.length, new: 0, learning: 0, mastered: 0 }
  for (const id of pack) progress[studyState(stats[id])]++
  return progress
}

/** Qué preguntas del paquete se repiten: todas, las falladas (no dominadas) o las marcadas. */
export type PackFilter = 'all' | 'failed' | 'flagged'

export function packQuestions(pack: readonly string[], filter: PackFilter, stats: Stats, flagged: readonly string[]): string[] {
  if (filter === 'failed') return pack.filter((id) => studyState(stats[id]) === 'learning')
  if (filter === 'flagged') return pack.filter((id) => flagged.includes(id))
  return [...pack]
}
