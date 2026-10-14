import { describe, expect, it } from 'vitest'
import { EXAM, SECTIONS } from './exam.ts'
import { makeBank, makeQuestion } from './fixtures.ts'
import { mulberry32 } from './rng.ts'
import { apportion, filterPool, sampleExam } from './sampling.ts'

const weights = SECTIONS.map((s) => s.weight)
const countBySection = (ids: { section: string }[]) => SECTIONS.map((s) => ids.filter((q) => q.section === s.key).length)

describe('apportion', () => {
  it('reparte las 65 preguntas del examen según los pesos de la guía', () => {
    expect(apportion(65, weights)).toEqual([10, 10, 7, 6, 6, 11, 10, 5])
  })

  it('suma siempre el total', () => {
    for (let n = 0; n <= 100; n++) expect(apportion(n, weights).reduce((a, b) => a + b, 0)).toBe(n)
  })

  it('no asigna nada a los pesos cero y desempata por orden', () => {
    expect(apportion(5, [0, 1, 0, 1])).toEqual([0, 3, 0, 2])
  })
})

describe('sampleExam', () => {
  const { questions: bank } = makeBank(20)

  it('elige 65 preguntas distintas con la cuota de cada sección', () => {
    const { questions, shortfall } = sampleExam(bank, EXAM.questionCount, mulberry32(1))
    expect(new Set(questions.map((q) => q.id)).size).toBe(65)
    expect(shortfall).toEqual([])
    expect(countBySection(questions)).toEqual([10, 10, 7, 6, 6, 11, 10, 5])
  })

  it('es determinista con la misma semilla', () => {
    const ids = (seed: number) => sampleExam(bank, 65, mulberry32(seed)).questions.map((q) => q.id)
    expect(ids(7)).toEqual(ids(7))
    expect(ids(7)).not.toEqual(ids(8))
  })

  it('cubre con otras secciones el déficit de una sección corta', () => {
    const short = bank.filter((q) => q.section !== 'agentforce' || ['agentforce-0', 'agentforce-1'].includes(q.id))
    const { questions, shortfall } = sampleExam(short, 65, mulberry32(2))
    expect(questions).toHaveLength(65)
    expect(new Set(questions.map((q) => q.id)).size).toBe(65)
    expect(shortfall).toEqual(['agentforce'])
    expect(questions.filter((q) => q.section === 'agentforce')).toHaveLength(2)
  })

  it('devuelve todo el banco si tiene menos preguntas que el examen', () => {
    const { questions } = sampleExam(makeBank(3).questions, 65, mulberry32(3))
    expect(questions).toHaveLength(24)
  })
})

describe('filterPool', () => {
  const pool = [
    makeQuestion('ok'),
    makeQuestion('corrected', 'config', { review: 'corrected' }),
    makeQuestion('disputed', 'config', { review: 'disputed' }),
    makeQuestion('outdated', 'data', { review: 'outdated' }),
    makeQuestion('official', 'data', { source: 'crt101' }),
  ]
  const ids = (list: { id: string }[]) => list.map((q) => q.id)

  it('excluye dudosas y obsoletas si se pide', () => {
    expect(ids(filterPool(pool, { excludeDoubtful: true, officialOnly: false }))).toEqual(['ok', 'corrected', 'official'])
    expect(filterPool(pool, { excludeDoubtful: false, officialOnly: false })).toHaveLength(5)
  })

  it('filtra por fuente oficial y por sección', () => {
    expect(ids(filterPool(pool, { excludeDoubtful: false, officialOnly: true }))).toEqual(['official'])
    expect(ids(filterPool(pool, { excludeDoubtful: false, officialOnly: false, sections: ['data'] }))).toEqual(['outdated', 'official'])
  })
})
