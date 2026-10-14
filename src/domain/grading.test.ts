import { describe, expect, it } from 'vitest'
import { makeQuestion } from './fixtures.ts'
import { grade, isCorrect, passes } from './grading.ts'

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
  it('con 65 preguntas aprueba con 45 aciertos y suspende con 44', () => {
    expect(passes(45, 65)).toBe(true)
    expect(passes(44, 65)).toBe(false)
  })

  it('sin preguntas no hay aprobado', () => {
    expect(passes(0, 0)).toBe(false)
  })
})

describe('grade', () => {
  it('cuenta las no contestadas como falladas y desglosa por sección', () => {
    const questions = [makeQuestion('a', 'config'), makeQuestion('b', 'config'), makeQuestion('c', 'data')]
    const score = grade(questions, { a: ['A'], c: ['B'] })
    expect(score).toMatchObject({ correct: 1, total: 3, percent: 33, passed: false })
    expect(score.bySection).toEqual({ config: { correct: 1, total: 2 }, data: { correct: 0, total: 1 } })
  })

  it('no redondea hacia arriba el porcentaje: 44/65 se muestra como 67 %', () => {
    const questions = Array.from({ length: 65 }, (_, i) => makeQuestion(`q${i}`))
    const answers = Object.fromEntries(questions.slice(0, 44).map((q) => [q.id, ['A']]))
    expect(grade(questions, answers)).toMatchObject({ correct: 44, percent: 67, passed: false })
  })
})
