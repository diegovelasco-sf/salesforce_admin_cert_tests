import { describe, expect, it } from 'vitest'
import { CERTS } from './certs.ts'
import { makeQuestion } from './fixtures.ts'
import { grade, isCorrect, neededToPass, passes } from './grading.ts'

const ADMIN = CERTS.admin.exam.passPercent
const APP_BUILDER = CERTS.appbuilder.exam.passPercent

describe('isCorrect', () => {
  const q = makeQuestion('q', 'config', { correct: ['A', 'C'] })

  it('exige exactamente las correctas, en cualquier orden', () => {
    expect(isCorrect(q, ['C', 'A'])).toBe(true)
    expect(isCorrect(q, ['A'])).toBe(false)
    expect(isCorrect(q, ['A', 'B'])).toBe(false)
    expect(isCorrect(q, ['A', 'B', 'C'])).toBe(false)
    expect(isCorrect(q, [])).toBe(false)
    expect(isCorrect(q, undefined)).toBe(false)
  })
})

describe('passes', () => {
  it('Platform Administrator: con 60 preguntas puntuadas aprueba con 41 y suspende con 40', () => {
    expect(passes(41, 60, ADMIN)).toBe(true)
    expect(passes(40, 60, ADMIN)).toBe(false)
  })

  it('Platform App Builder: con 60 preguntas puntuadas aprueba con 44 y suspende con 43', () => {
    expect(passes(44, 60, APP_BUILDER)).toBe(true)
    expect(passes(43, 60, APP_BUILDER)).toBe(false)
  })

  it('el mismo número de aciertos puede aprobar un examen y suspender el otro', () => {
    expect(passes(42, 60, ADMIN)).toBe(true)
    expect(passes(42, 60, APP_BUILDER)).toBe(false)
  })

  it('sin preguntas no hay aprobado', () => {
    expect(passes(0, 0, ADMIN)).toBe(false)
  })
})

describe('neededToPass', () => {
  it('redondea hacia arriba: 41 de 60 al 68 % y 44 de 60 al 73 %', () => {
    expect(neededToPass(60, ADMIN)).toBe(41)
    expect(neededToPass(60, APP_BUILDER)).toBe(44)
  })

  it('coincide con passes: es el menor número de aciertos que aprueba', () => {
    for (const passPercent of [ADMIN, APP_BUILDER]) {
      for (let total = 1; total <= 65; total++) {
        const needed = neededToPass(total, passPercent)
        expect(passes(needed, total, passPercent)).toBe(true)
        expect(passes(needed - 1, total, passPercent)).toBe(false)
      }
    }
  })
})

describe('grade', () => {
  it('cuenta las no contestadas como falladas y desglosa por sección', () => {
    const questions = [makeQuestion('a', 'config'), makeQuestion('b', 'config'), makeQuestion('c', 'data')]
    const score = grade(questions, { a: ['A'], c: ['B'] }, { passPercent: ADMIN })
    expect(score).toMatchObject({ correct: 1, total: 3, percent: 33, passed: false })
    expect(score.bySection).toEqual({ config: { correct: 1, total: 2 }, data: { correct: 0, total: 1 } })
  })

  it('no redondea hacia arriba el porcentaje: 40/60 se muestra como 66 %', () => {
    const questions = Array.from({ length: 60 }, (_, i) => makeQuestion(`q${i}`))
    const answers = Object.fromEntries(questions.slice(0, 40).map((q) => [q.id, ['A']]))
    expect(grade(questions, answers, { passPercent: ADMIN })).toMatchObject({ correct: 40, percent: 66, passed: false })
  })

  it('las preguntas de reserva no puntúan: ni suman, ni restan, ni salen en el desglose', () => {
    const questions = Array.from({ length: 65 }, (_, i) => makeQuestion(`q${i}`, i < 60 ? 'config' : 'data'))
    const reserve = questions.slice(60).map((q) => q.id)
    // Acierta las 41 primeras y falla las 19 siguientes; las 5 de reserva, todas bien.
    const answers = Object.fromEntries(questions.map((q, i) => [q.id, i < 41 || i >= 60 ? ['A'] : ['B']]))
    const score = grade(questions, answers, { unscored: reserve, passPercent: ADMIN })
    expect(score).toMatchObject({ correct: 41, total: 60, passed: true })
    expect(score.bySection).toEqual({ config: { correct: 41, total: 60 } })
  })

  it('fallar las de reserva no hace perder puntos', () => {
    const questions = Array.from({ length: 65 }, (_, i) => makeQuestion(`q${i}`))
    const reserve = questions.slice(0, 5).map((q) => q.id)
    const answers = Object.fromEntries(questions.slice(5).map((q) => [q.id, ['A']]))
    expect(grade(questions, answers, { unscored: reserve, passPercent: APP_BUILDER })).toMatchObject({ correct: 60, total: 60, percent: 100, passed: true })
  })
})
