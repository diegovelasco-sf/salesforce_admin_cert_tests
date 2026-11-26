import { describe, expect, it } from 'vitest'
import { CERTS } from './certs.ts'
import { makeQuestion } from './fixtures.ts'
import { mulberry32 } from './rng.ts'
import { recordAnswer, type Stats } from './stats.ts'
import { buildPacks, packProgress, packQuestions, studyState, syncPlan, type StudyPlan } from './study.ts'
import type { Question } from './types.ts'

const { appbuilder } = CERTS

/** Banco de App Builder con la proporción de su guía: 18/20/32/17/13 por cada 100. */
function bank(total: number): Question[] {
  const weights = appbuilder.sections.map((s) => s.weight)
  return appbuilder.sections.flatMap((s, i) =>
    Array.from({ length: Math.round((total * weights[i]) / 100) }, (_, n) => makeQuestion(`${s.key}-${n}`, s.key)),
  )
}

describe('buildPacks', () => {
  const questions = bank(300)
  const packs = buildPacks(questions, appbuilder, 30, mulberry32(1))

  it('reparte todas las preguntas, cada una en un solo paquete', () => {
    const ids = packs.flat()
    expect(ids).toHaveLength(questions.length)
    expect(new Set(ids).size).toBe(questions.length)
  })

  it('hace paquetes de unas 30 preguntas, que difieren como mucho en una', () => {
    expect(packs).toHaveLength(10)
    const sizes = packs.map((p) => p.length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    // Con 302 preguntas: 10 paquetes de 30 o 31, no 11 de 27 o 28.
    const odd = buildPacks(bank(302), appbuilder, 30, mulberry32(2)).map((p) => p.length)
    expect(odd).toHaveLength(10)
    expect(Math.min(...odd)).toBe(30)
    expect(Math.max(...odd)).toBe(31)
    expect(buildPacks(bank(20), appbuilder, 30, mulberry32(2))).toHaveLength(1)
  })

  it('cada paquete lleva la mezcla de secciones del banco (±1 por sección)', () => {
    const section = (id: string) => questions.find((q) => q.id === id)!.section
    for (const s of appbuilder.sections) {
      const counts = packs.map((p) => p.filter((id) => section(id) === s.key).length)
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }
  })

  it('con 60 hace la mitad de paquetes, y con la misma semilla da los mismos', () => {
    expect(buildPacks(questions, appbuilder, 60, mulberry32(1))).toHaveLength(5)
    expect(buildPacks(questions, appbuilder, 30, mulberry32(1))).toEqual(packs)
    expect(buildPacks([], appbuilder, 30, mulberry32(1))).toEqual([])
  })
})

describe('syncPlan', () => {
  // Tamaño 3 para el test: fuera de PACK_SIZES, solo cambia dónde se abre un paquete nuevo.
  const plan = { size: 3, excludeDoubtful: true, packs: [['a', 'b', 'c'], ['d', 'e']], stats: {}, createdAt: 0 } as unknown as StudyPlan
  const qs = (...ids: string[]) => ids.map((id) => makeQuestion(id, 'logic'))

  it('no cambia nada si el banco es el mismo', () => {
    expect(syncPlan(plan, qs('a', 'b', 'c', 'd', 'e'))).toBe(plan)
  })

  it('quita las retiradas y añade las nuevas al final sin mover las demás', () => {
    const synced = syncPlan(plan, qs('a', 'c', 'd', 'e', 'f', 'g'))
    expect(synced.packs).toEqual([['a', 'c'], ['d', 'e', 'f'], ['g']])
  })

  it('un paquete que se queda vacío desaparece', () => {
    expect(syncPlan(plan, qs('a', 'b', 'c')).packs).toEqual([['a', 'b', 'c']])
  })
})

describe('dominio de un paquete', () => {
  let stats: Stats = {}
  stats = recordAnswer(stats, 'ok', true, 1)
  stats = recordAnswer(stats, 'miss', false, 1)
  stats = recordAnswer(stats, 'fixed', false, 1)
  stats = recordAnswer(stats, 'fixed', true, 2)
  stats = recordAnswer(stats, 'fixed', true, 3)
  stats = recordAnswer(stats, 'once', false, 1)
  stats = recordAnswer(stats, 'once', true, 2)
  const pack = ['ok', 'miss', 'fixed', 'once', 'new']

  it('dominada: acertada sin fallos, o dos aciertos seguidos tras fallarla', () => {
    expect(pack.map((id) => studyState(stats[id]))).toEqual(['mastered', 'learning', 'mastered', 'learning', 'new'])
    expect(packProgress(pack, stats)).toEqual({ total: 5, new: 1, learning: 2, mastered: 2 })
  })

  it('repite todas, las falladas que aún no domina o las marcadas del paquete', () => {
    expect(packQuestions(pack, 'all', stats, [])).toEqual(pack)
    expect(packQuestions(pack, 'failed', stats, [])).toEqual(['miss', 'once'])
    expect(packQuestions(pack, 'flagged', stats, ['new', 'other'])).toEqual(['new'])
  })
})

describe('paquetes de unas secciones', () => {
  const questions = bank(300)
  const sections = ['logic', 'ui'] as const
  const pool = questions.filter((q) => (sections as readonly string[]).includes(q.section))
  const packs = buildPacks(pool, appbuilder, 30, mulberry32(3))

  it('solo llevan preguntas de las secciones elegidas, en su proporción del banco', () => {
    const section = (id: string) => questions.find((q) => q.id === id)!.section
    expect(packs.flat().every((id) => (sections as readonly string[]).includes(section(id)))).toBe(true)
    // 96 de logic y 51 de ui: 147 preguntas, 5 paquetes de 29 o 30, cada uno con unas 19 de logic y 10 de ui.
    expect(packs).toHaveLength(5)
    for (const pack of packs) {
      const logic = pack.filter((id) => section(id) === 'logic').length
      expect(logic).toBeGreaterThanOrEqual(19)
      expect(logic).toBeLessThanOrEqual(20)
    }
  })

  it('al ponerse al día con el banco, no mete preguntas de otras secciones', () => {
    const plan: StudyPlan = { size: 30, excludeDoubtful: true, sections: [...sections], packs, stats: {}, createdAt: 0 }
    // El plan se sincroniza con el pool ya filtrado por sus secciones, como hace initState.
    expect(syncPlan(plan, pool)).toBe(plan)
  })
})
