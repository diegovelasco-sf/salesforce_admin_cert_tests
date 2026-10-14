import { OFFICIAL_SOURCES, SECTIONS } from './exam.ts'
import type { Rng } from './rng.ts'
import { shuffle } from './shuffle.ts'
import type { Question, SectionKey } from './types.ts'

/**
 * Reparte `total` en proporción a `weights` (enteros) por restos mayores; los empates se
 * resuelven por orden. La suma del resultado es siempre `total`.
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum === 0) return weights.map(() => 0)
  const counts = weights.map((w) => Math.floor((total * w) / sum))
  const byRemainder = weights
    .map((w, i) => ({ i, remainder: (total * w) % sum }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
  let left = total - counts.reduce((a, b) => a + b, 0)
  for (const { i } of byRemainder) {
    if (left === 0) break
    counts[i]++
    left--
  }
  return counts
}

export interface PoolFilter {
  /** Deja fuera las preguntas dudosas u obsoletas. */
  excludeDoubtful: boolean
  officialOnly: boolean
  sections?: readonly SectionKey[]
}

export const isDoubtful = (q: Question): boolean => q.review === 'disputed' || q.review === 'outdated'

export function filterPool(questions: readonly Question[], filter: PoolFilter): Question[] {
  return questions.filter(
    (q) =>
      (!filter.excludeDoubtful || !isDoubtful(q)) &&
      (!filter.officialOnly || OFFICIAL_SOURCES.includes(q.source)) &&
      (!filter.sections || filter.sections.includes(q.section)),
  )
}

export interface ExamSample {
  questions: Question[]
  /** Secciones que no llegan a su cuota; su hueco se cubre con preguntas de otras. */
  shortfall: SectionKey[]
}

/**
 * Elige `count` preguntas sin repetir, repartidas por sección según los pesos de la guía. Si una
 * sección no tiene bastantes, el déficit se reparte por peso entre las que tienen de sobra.
 */
export function sampleExam(pool: readonly Question[], count: number, rng: Rng): ExamSample {
  const available = SECTIONS.map((s) => shuffle(pool.filter((q) => q.section === s.key), rng))
  const target = Math.min(count, pool.length)
  const quota = apportion(target, SECTIONS.map((s) => s.weight))
  const take = quota.map((n, i) => Math.min(n, available[i].length))
  const shortfall = SECTIONS.filter((_, i) => take[i] < quota[i]).map((s) => s.key)

  let missing = target - take.reduce((a, b) => a + b, 0)
  while (missing > 0) {
    const spare = available.map((list, i) => list.length - take[i])
    const extra = apportion(missing, SECTIONS.map((s, i) => (spare[i] > 0 ? s.weight : 0)))
    extra.forEach((n, i) => {
      const add = Math.min(n, spare[i])
      take[i] += add
      missing -= add
    })
  }

  const chosen = available.flatMap((list, i) => list.slice(0, take[i]))
  return { questions: shuffle(chosen, rng), shortfall }
}

/** Preguntas de práctica: barajadas y como mucho `count`. */
export const samplePractice = (pool: readonly Question[], count: number, rng: Rng): Question[] =>
  shuffle(pool, rng).slice(0, count)
