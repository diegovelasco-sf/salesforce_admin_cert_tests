import { EXAM } from './exam.ts'
import type { Question, SectionKey } from './types.ts'

/** Todo o nada, como en el examen: acierta solo si marca exactamente las correctas. */
export function isCorrect(question: Question, selected: readonly string[] | undefined): boolean {
  if (!selected || selected.length !== question.correct.length) return false
  return question.correct.every((key) => selected.includes(key))
}

/** Aritmética entera para no depender de redondeos: con 65 preguntas hacen falta 45. */
export const passes = (correct: number, total: number): boolean =>
  total > 0 && correct * 100 >= EXAM.passPercent * total

export interface Tally {
  correct: number
  total: number
}

export interface Score extends Tally {
  percent: number
  passed: boolean
  bySection: Partial<Record<SectionKey, Tally>>
}

/** Las preguntas sin contestar cuentan como falladas. */
export function grade(questions: readonly Question[], answers: Readonly<Record<string, string[]>>): Score {
  const bySection: Partial<Record<SectionKey, Tally>> = {}
  let correct = 0
  for (const question of questions) {
    const ok = isCorrect(question, answers[question.id])
    const tally = (bySection[question.section] ??= { correct: 0, total: 0 })
    tally.total++
    if (ok) {
      tally.correct++
      correct++
    }
  }
  const total = questions.length
  return {
    correct,
    total,
    percent: total ? Math.floor((correct * 100) / total) : 0,
    passed: passes(correct, total),
    bySection,
  }
}
