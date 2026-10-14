import { describe, expect, it } from 'vitest'
import { EXAM } from './exam.ts'
import { makeBank } from './fixtures.ts'
import { mulberry32 } from './rng.ts'
import { createExamSession, remainingMs, resumeExam, setAnswer, submit, toggleFlag, unanswered } from './session.ts'

const bank = makeBank(20, 'v1')
const start = (now = 1_000) => createExamSession(bank, bank.questions, { now, seed: 42, rng: mulberry32(42) }).session

describe('createExamSession', () => {
  it('prepara 65 preguntas, el orden de sus opciones y la hora límite', () => {
    const session = start()
    expect(session.questionIds).toHaveLength(EXAM.questionCount)
    expect(Object.keys(session.optionOrder)).toHaveLength(EXAM.questionCount)
    expect(session.deadline - session.startedAt).toBe(EXAM.durationMinutes * 60_000)
    expect(unanswered(session)).toBe(65)
  })
})

describe('respuestas y marcas', () => {
  it('guarda respuestas y marcas, y deja de aceptarlas al entregar', () => {
    let session = start()
    const [first] = session.questionIds
    session = toggleFlag(setAnswer(session, first, ['B']), first)
    expect(session.answers[first]).toEqual(['B'])
    expect(session.flagged).toEqual([first])
    expect(unanswered(session)).toBe(64)

    session = submit(session, 2_000)
    expect(setAnswer(session, first, ['C']).answers[first]).toEqual(['B'])
    expect(toggleFlag(session, first).flagged).toEqual([first])
  })

  it('una entrega tardía cuenta como entregada en la hora límite', () => {
    const session = start()
    expect(submit(session, session.deadline + 5_000).submittedAt).toBe(session.deadline)
    expect(remainingMs(session, session.deadline + 5_000)).toBe(0)
  })
})

describe('resumeExam', () => {
  it('reanuda un simulacro a medias tal cual', () => {
    const session = start()
    expect(resumeExam(session, bank, session.startedAt + 60_000)).toEqual({ session })
  })

  it('entrega un simulacro cuyo tiempo venció mientras la app estaba cerrada', () => {
    const session = start()
    const { session: resumed, notice } = resumeExam(session, bank, session.deadline + 1)
    expect(resumed?.submittedAt).toBe(session.deadline)
    expect(notice).toMatch(/agotó/)
  })

  it('descarta el simulacro si falta alguna de sus preguntas u opciones', () => {
    const session = start()
    const [first] = session.questionIds
    const withoutQuestion = { ...bank, hash: 'v2', questions: bank.questions.filter((q) => q.id !== first) }
    expect(resumeExam(session, withoutQuestion, session.startedAt).session).toBeUndefined()

    const withoutOption = {
      ...bank,
      hash: 'v3',
      questions: bank.questions.map((q) => (q.id === first ? { ...q, options: q.options.slice(0, 3) } : q)),
    }
    expect(resumeExam(session, withoutOption, session.startedAt).notice).toMatch(/ha cambiado/)
  })
})
