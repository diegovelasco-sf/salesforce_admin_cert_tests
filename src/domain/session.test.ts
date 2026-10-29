import { describe, expect, it } from 'vitest'
import { CERTS } from './certs.ts'
import { makeBank } from './fixtures.ts'
import { mulberry32 } from './rng.ts'
import { createExamSession, remainingMs, resumeExam, scoredIds, setAnswer, submit, toggleFlag, unanswered } from './session.ts'

const { admin, appbuilder } = CERTS
const bank = makeBank(20, 'v1')
const start = (now = 1_000) => createExamSession(bank, admin, bank.questions, { now, seed: 42, rng: mulberry32(42) }).session

describe('createExamSession', () => {
  it('prepara 65 preguntas, el orden de sus opciones y la hora límite', () => {
    const session = start()
    expect(session.questionIds).toHaveLength(admin.exam.questionCount)
    expect(Object.keys(session.optionOrder)).toHaveLength(admin.exam.questionCount)
    expect(session.deadline - session.startedAt).toBe(admin.exam.durationMinutes * 60_000)
    expect(unanswered(session)).toBe(65)
  })

  it('reserva 5 de las 65 sin puntuar, y las otras 60 puntúan', () => {
    const session = start()
    expect(session.unscored).toHaveLength(5)
    expect(new Set(session.unscored).size).toBe(5)
    expect(session.unscored!.every((id) => session.questionIds.includes(id))).toBe(true)
    expect(scoredIds(session)).toHaveLength(60)
  })

  it('las de reserva se eligen entre las ya elegidas, así que no cambian el reparto por sección', () => {
    const session = start()
    const sampled = createExamSession(bank, admin, bank.questions, { now: 1_000, seed: 42, rng: mulberry32(42) }).session
    expect(sampled.questionIds).toEqual(session.questionIds)
  })

  it('Platform App Builder: mismo formato de 65 con 60 puntuadas, y solo preguntas de su banco', () => {
    const abBank = makeBank(30, 'ab1', appbuilder)
    const { session } = createExamSession(abBank, appbuilder, abBank.questions, { now: 1_000, seed: 3, rng: mulberry32(3) })
    expect(session.questionIds).toHaveLength(65)
    expect(session.unscored).toHaveLength(5)
    expect(session.deadline - session.startedAt).toBe(appbuilder.exam.durationMinutes * 60_000)
    const keys = new Set(appbuilder.sections.map((s) => s.key))
    const bySection = new Map(abBank.questions.map((q) => [q.id, q.section]))
    expect(session.questionIds.every((id) => keys.has(bySection.get(id)!))).toBe(true)
  })

  it('con un banco corto, no reserva más de las que sobran sobre las puntuadas', () => {
    const small = makeBank(3)
    const { session } = createExamSession(small, admin, small.questions, { now: 1_000, seed: 1, rng: mulberry32(1) })
    expect(session.questionIds).toHaveLength(24)
    expect(session.unscored).toHaveLength(0)
    expect(scoredIds(session)).toHaveLength(24)
  })
})

describe('scoredIds', () => {
  it('un simulacro guardado antes de las preguntas de reserva puntúa entero', () => {
    const { unscored: _unscored, ...legacy } = start()
    expect(scoredIds(legacy)).toHaveLength(65)
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

  it('un simulacro de una certificación no se reanuda con el banco de la otra', () => {
    const session = start()
    const other = makeBank(20, 'v1', appbuilder)
    expect(resumeExam(session, other, session.startedAt).session).toBeUndefined()
  })
})
