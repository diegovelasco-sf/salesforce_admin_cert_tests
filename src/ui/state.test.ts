import { describe, expect, it } from 'vitest'
import { CERTS } from '../domain/certs.ts'
import { makeBank } from '../domain/fixtures.ts'
import { mulberry32 } from '../domain/rng.ts'
import { createExamSession } from '../domain/session.ts'
import { emptyProgress } from '../domain/storage.ts'
import { makeCertData } from './certdata.ts'
import { createReducer, initState, makeRun, type AppState } from './state.ts'

const data = makeCertData(CERTS.admin, makeBank(20, 'v1'))
const { bank } = data
const reducer = createReducer(data)
const fresh = (): AppState => ({ progress: emptyProgress('admin'), screen: { name: 'home' }, notices: [] })
const startExam = (state: AppState, now = 1_000) => {
  const { session } = createExamSession(bank, CERTS.admin, bank.questions, { now, seed: 1, rng: mulberry32(1) })
  return reducer(state, { type: 'exam/start', session })
}

describe('práctica', () => {
  it('al comprobar registra la respuesta en las estadísticas una sola vez', () => {
    const [q] = bank.questions
    let state = reducer(fresh(), { type: 'navigate', screen: { name: 'practice', run: makeRun('practice', [q], mulberry32(1)) } })
    state = reducer(state, { type: 'practice/select', id: q.id, keys: ['B'] })
    state = reducer(state, { type: 'practice/check', id: q.id, now: 5 })
    state = reducer(state, { type: 'practice/check', id: q.id, now: 6 })
    expect(state.progress.stats[q.id]).toMatchObject({ seen: 1, correct: 0, lastCorrect: false })
    // Una vez comprobada, la selección ya no cambia.
    expect(reducer(state, { type: 'practice/select', id: q.id, keys: ['A'] })).toBe(state)
  })
})

describe('simulacro', () => {
  it('al entregar pasa al historial, a las estadísticas y a Repaso una sola vez', () => {
    let state = startExam(fresh())
    const exam = state.progress.activeExam!
    // Contesta bien una pregunta que puntúa y mal otra; deja las de reserva fuera del recuento.
    const [a, b, c] = exam.questionIds.filter((id) => !exam.unscored!.includes(id))
    state = reducer(state, { type: 'exam/answer', id: a, keys: ['A'] })
    state = reducer(state, { type: 'exam/answer', id: b, keys: ['C'] })
    state = reducer(state, { type: 'exam/flag', id: c })
    state = reducer(state, { type: 'exam/submit', now: 2_000 })
    state = reducer(state, { type: 'exam/submit', now: 3_000 })

    expect(state.screen).toEqual({ name: 'results' })
    expect(state.progress.history).toHaveLength(1)
    // Puntúan 60 de las 65: el historial guarda la nota sobre las puntuadas.
    expect(state.progress.history[0]).toMatchObject({ correct: 1, total: 60, passed: false, submittedAt: 2_000 })
    expect(Object.keys(state.progress.stats).sort()).toEqual([a, b].sort())
    expect(state.progress.flagged).toEqual([c])
  })

  it('las preguntas de reserva no puntúan, pero lo que contestas cuenta para tus estadísticas', () => {
    let state = startExam(fresh())
    const exam = state.progress.activeExam!
    const [reserve] = exam.unscored!
    const [scored] = exam.questionIds.filter((id) => !exam.unscored!.includes(id))
    state = reducer(state, { type: 'exam/answer', id: reserve, keys: ['A'] })
    state = reducer(state, { type: 'exam/answer', id: scored, keys: ['A'] })
    state = reducer(state, { type: 'exam/submit', now: 2_000 })
    expect(state.progress.history[0]).toMatchObject({ correct: 1, total: 60 })
    expect(state.progress.stats[reserve]).toMatchObject({ seen: 1, correct: 1 })
  })

  it('al recargar con el tiempo vencido, entrega el simulacro y lo registra', () => {
    const started = startExam(fresh())
    const deadline = started.progress.activeExam!.deadline
    const state = initState(data, { progress: started.progress }, deadline + 10)
    expect(state.screen).toEqual({ name: 'results' })
    expect(state.progress.history).toHaveLength(1)
    expect(state.notices).toEqual([{ kind: 'expired' }])
    // Recargar de nuevo la página de resultados no lo vuelve a registrar.
    expect(initState(data, { progress: state.progress }, deadline + 20).progress.history).toHaveLength(1)
  })

  it('descarta con aviso un simulacro cuyo banco ha cambiado', () => {
    const started = startExam(fresh())
    const [first] = started.progress.activeExam!.questionIds
    const changed = makeCertData(CERTS.admin, { hash: 'v2', questions: bank.questions.filter((q) => q.id !== first) })
    const state = initState(changed, { progress: started.progress }, 1_500)
    expect(state.progress.activeExam).toBeUndefined()
    expect(state.notices).toEqual([{ kind: 'bank-changed' }])
  })

  it('avisa si los datos guardados estaban dañados', () => {
    const state = initState(data, { progress: emptyProgress('admin'), backupKey: 'k.backup-1' }, 0)
    expect(state.notices).toEqual([{ kind: 'backup', key: 'k.backup-1' }])
  })
})

describe('Platform App Builder', () => {
  const appbuilder = makeCertData(CERTS.appbuilder, makeBank(30, 'ab1', CERTS.appbuilder))
  const abReducer = createReducer(appbuilder)

  it('aprueba con el 73 %: 44 de 60 aciertos', () => {
    const { session } = createExamSession(appbuilder.bank, CERTS.appbuilder, appbuilder.bank.questions, { now: 1_000, seed: 5, rng: mulberry32(5) })
    let state: AppState = { progress: emptyProgress('appbuilder'), screen: { name: 'home' }, notices: [] }
    state = abReducer(state, { type: 'exam/start', session })
    const scored = session.questionIds.filter((id) => !session.unscored!.includes(id))
    for (const id of scored.slice(0, 44)) state = abReducer(state, { type: 'exam/answer', id, keys: ['A'] })
    const passed = abReducer(state, { type: 'exam/submit', now: 2_000 })
    expect(passed.progress.history[0]).toMatchObject({ correct: 44, total: 60, passed: true })

    // Con 43 aciertos, que aprobarían en Administrator (41), aquí se suspende.
    let short: AppState = abReducer({ progress: emptyProgress('appbuilder'), screen: { name: 'home' }, notices: [] }, { type: 'exam/start', session })
    for (const id of scored.slice(0, 43)) short = abReducer(short, { type: 'exam/answer', id, keys: ['A'] })
    expect(abReducer(short, { type: 'exam/submit', now: 2_000 }).progress.history[0]).toMatchObject({ correct: 43, total: 60, passed: false })
  })

  it('no encuentra las preguntas de Administrator, ni al revés: cada banco solo conoce las suyas', () => {
    const adminId = data.bank.questions[0].id
    const appBuilderId = appbuilder.bank.questions[0].id
    expect(() => appbuilder.question(adminId)).toThrow(/Platform App Builder/)
    expect(() => data.question(appBuilderId)).toThrow(/Platform Administrator/)
    expect(appbuilder.byId.has(adminId)).toBe(false)
    expect(data.byId.has(appBuilderId)).toBe(false)
  })
})
