import bank from '../data/questions.json'
import type { Question } from '../domain/types.ts'

export const BANK = bank
export const QUESTIONS_BY_ID: ReadonlyMap<string, Question> = new Map(bank.questions.map((q) => [q.id, q]))

export const question = (id: string): Question => {
  const found = QUESTIONS_BY_ID.get(id)
  if (!found) throw new Error(`Pregunta desconocida: ${id}`)
  return found
}
