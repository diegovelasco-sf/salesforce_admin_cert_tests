import { describe, expect, it } from 'vitest'
import { makeBank } from '../domain/fixtures.ts'
import { mulberry32 } from '../domain/rng.ts'
import { createExamSession } from '../domain/session.ts'
import { emptyProgress } from '../domain/storage.ts'
import { createReducer, initState, makeRun, type AppState } from './state.ts'

const bank = makeBank(20, 'v1')
const byId = new Map(bank.questions.map((q) => [q.id, q]))
const reducer = createReducer(byId)
const fresh = (): AppState => ({ progress: emptyProgress(), screen: { name: 'home' }, notices: [] })
const startExam = (state: AppState, now = 1_000) => {
  const { session } = createExamSession(bank, bank.questions, { now, seed: 1, rng: mulberry32(1) })
  return reducer(state, { type: 'exam/start', session })
}

describe('práctica', () => {
  it('al comprobar registra la respuesta en las estadísticas una sola vez', () => {
    const [q] = bank.questions
    let state = reducer(fresh(), { type: 'navigate', screen: { name: 'practice', run: makeRun('Práctica', [q], mulberry32(1)) } })
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
    const [a, b, c] = state.progress.activeExam!.questionIds
    state = reducer(state, { type: 'exam/answer', id: a, keys: ['A'] })
    state = reducer(state, { type: 'exam/answer', id: b, keys: ['C'] })
    state = reducer(state, { type: 'exam/flag', id: c })
    state = reducer(state, { type: 'exam/submit', now: 2_000 })
    state = reducer(state, { type: 'exam/submit', now: 3_000 })

    expect(state.screen).toEqual({ name: 'results' })
    expect(state.progress.history).toHaveLength(1)
    expect(state.progress.history[0]).toMatchObject({ correct: 1, total: 65, passed: false, submittedAt: 2_000 })
    expect(Object.keys(state.progress.stats).sort()).toEqual([a, b].sort())
    expect(state.progress.flagged).toEqual([c])
  })

  it('al recargar con el tiempo vencido, entrega el simulacro y lo registra', () => {
    const started = startExam(fresh())
    const deadline = started.progress.activeExam!.deadline
    const state = initState(bank, byId, { progress: started.progress }, deadline + 10)
    expect(state.screen).toEqual({ name: 'results' })
    expect(state.progress.history).toHaveLength(1)
    expect(state.notices[0]).toMatch(/agotó/)
    // Recargar de nuevo la página de resultados no lo vuelve a registrar.
    expect(initState(bank, byId, { progress: state.progress }, deadline + 20).progress.history).toHaveLength(1)
  })

  it('descarta con aviso un simulacro cuyo banco ha cambiado', () => {
    const started = startExam(fresh())
    const [first] = started.progress.activeExam!.questionIds
    const changed = { hash: 'v2', questions: bank.questions.filter((q) => q.id !== first) }
    const state = initState(changed, byId, { progress: started.progress }, 1_500)
    expect(state.progress.activeExam).toBeUndefined()
    expect(state.notices[0]).toMatch(/ha cambiado/)
  })

  it('avisa si los datos guardados estaban dañados', () => {
    const state = initState(bank, byId, { progress: emptyProgress(), backupKey: 'k.backup-1' }, 0)
    expect(state.notices[0]).toMatch(/k\.backup-1/)
  })
})
