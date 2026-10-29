import type { Question, SectionKey } from './types.ts'

/** Todo o nada, como en el examen: acierta solo si marca exactamente las correctas. */
export function isCorrect(question: Question, selected: readonly string[] | undefined): boolean {
  if (!selected || selected.length !== question.correct.length) return false
  return question.correct.every((key) => selected.includes(key))
}

/** Aritmética entera para no depender de redondeos: con 60 preguntas y el 68 % hacen falta 41. */
export const passes = (correct: number, total: number, passPercent: number): boolean => total > 0 && correct * 100 >= passPercent * total

/** Aciertos mínimos para aprobar sobre `total` preguntas puntuadas: 41 de 60 al 68 %, 44 de 60 al 73 %. */
export const neededToPass = (total: number, passPercent: number): number => Math.ceil((passPercent * total) / 100)

export interface Tally {
  correct: number
  total: number
}

export interface Score extends Tally {
  percent: number
  passed: boolean
  bySection: Partial<Record<SectionKey, Tally>>
}

export interface GradeOptions {
  /** Preguntas de reserva: se corrigen, pero no cuentan para la nota ni para el desglose. */
  unscored?: readonly string[]
  /** Porcentaje para aprobar, el de la certificación. */
  passPercent: number
}

/** Las preguntas sin contestar cuentan como falladas. */
export function grade(questions: readonly Question[], answers: Readonly<Record<string, string[]>>, { unscored = [], passPercent }: GradeOptions): Score {
  const bySection: Partial<Record<SectionKey, Tally>> = {}
  let correct = 0
  let total = 0
  for (const question of questions) {
    if (unscored.includes(question.id)) continue
    const ok = isCorrect(question, answers[question.id])
    const tally = (bySection[question.section] ??= { correct: 0, total: 0 })
    tally.total++
    total++
    if (ok) {
      tally.correct++
      correct++
    }
  }
  return {
    correct,
    total,
    percent: total ? Math.floor((correct * 100) / total) : 0,
    passed: passes(correct, total, passPercent),
    bySection,
  }
}
