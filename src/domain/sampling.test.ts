import { describe, expect, it } from 'vitest'
import { CERTS } from './certs.ts'
import { makeBank, makeQuestion } from './fixtures.ts'
import { mulberry32 } from './rng.ts'
import { apportion, filterPool, sampleExam } from './sampling.ts'

const { admin, appbuilder } = CERTS
const countBySection = (cert: typeof admin, list: { section: string }[]) =>
  cert.sections.map((s) => list.filter((q) => q.section === s.key).length)

describe('apportion', () => {
  const adminWeights = admin.sections.map((s) => s.weight)

  it('Platform Administrator: reparte las 65 preguntas según los pesos de la guía', () => {
    expect(apportion(65, adminWeights)).toEqual([10, 10, 7, 6, 6, 11, 10, 5])
  })

  it('Platform App Builder: reparte las 65 preguntas entre sus 5 secciones', () => {
    expect(apportion(65, appbuilder.sections.map((s) => s.weight))).toEqual([12, 13, 21, 11, 8])
  })

  it('suma siempre el total', () => {
    for (const cert of [admin, appbuilder]) {
      const weights = cert.sections.map((s) => s.weight)
      for (let n = 0; n <= 100; n++) expect(apportion(n, weights).reduce((a, b) => a + b, 0)).toBe(n)
    }
  })

  it('no asigna nada a los pesos cero y desempata por orden', () => {
    expect(apportion(5, [0, 1, 0, 1])).toEqual([0, 3, 0, 2])
  })
})

describe('sampleExam', () => {
  const { questions: bank } = makeBank(20)

  it('elige 65 preguntas distintas con la cuota de cada sección', () => {
    const { questions, shortfall } = sampleExam(bank, admin, mulberry32(1))
    expect(new Set(questions.map((q) => q.id)).size).toBe(65)
    expect(shortfall).toEqual([])
    expect(countBySection(admin, questions)).toEqual([10, 10, 7, 6, 6, 11, 10, 5])
  })

  it('es determinista con la misma semilla', () => {
    const ids = (seed: number) => sampleExam(bank, admin, mulberry32(seed)).questions.map((q) => q.id)
    expect(ids(7)).toEqual(ids(7))
    expect(ids(7)).not.toEqual(ids(8))
  })

  it('cubre con otras secciones el déficit de una sección corta', () => {
    const short = bank.filter((q) => q.section !== 'agentforce' || ['agentforce-0', 'agentforce-1'].includes(q.id))
    const { questions, shortfall } = sampleExam(short, admin, mulberry32(2))
    expect(questions).toHaveLength(65)
    expect(new Set(questions.map((q) => q.id)).size).toBe(65)
    expect(shortfall).toEqual(['agentforce'])
    expect(questions.filter((q) => q.section === 'agentforce')).toHaveLength(2)
  })

  it('devuelve todo el banco si tiene menos preguntas que el examen', () => {
    const { questions } = sampleExam(makeBank(3).questions, admin, mulberry32(3))
    expect(questions).toHaveLength(24)
  })

  it('Platform App Builder: 65 preguntas repartidas por sus 5 secciones, sin mezclar las de Administrator', () => {
    const { questions: abBank } = makeBank(30, 'ab', appbuilder)
    const { questions, shortfall } = sampleExam(abBank, appbuilder, mulberry32(4))
    expect(questions).toHaveLength(65)
    expect(shortfall).toEqual([])
    expect(countBySection(appbuilder, questions)).toEqual([12, 13, 21, 11, 8])
    const keys = new Set(appbuilder.sections.map((s) => s.key))
    expect(questions.every((q) => keys.has(q.section))).toBe(true)
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
    expect(ids(filterPool(pool, admin, { excludeDoubtful: true, officialOnly: false }))).toEqual(['ok', 'corrected', 'official'])
    expect(filterPool(pool, admin, { excludeDoubtful: false, officialOnly: false })).toHaveLength(5)
  })

  it('filtra por fuente oficial y por sección', () => {
    expect(ids(filterPool(pool, admin, { excludeDoubtful: false, officialOnly: true }))).toEqual(['official'])
    expect(ids(filterPool(pool, admin, { excludeDoubtful: false, officialOnly: false, sections: ['data'] }))).toEqual(['outdated', 'official'])
  })

  it('una certificación sin fuentes oficiales ignora «solo oficiales» en vez de dejar el banco vacío', () => {
    expect(filterPool(pool, appbuilder, { excludeDoubtful: false, officialOnly: true })).toHaveLength(5)
  })
})
