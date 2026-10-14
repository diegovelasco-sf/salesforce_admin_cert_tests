import { describe, expect, it } from 'vitest'
import { inReview, recordAnswer, type Stats } from './stats.ts'

describe('inReview', () => {
  it('entra al fallar y sale tras dos aciertos seguidos', () => {
    let stats: Stats = recordAnswer({}, 'q', false, 1)
    expect(inReview(stats.q, false)).toBe(true)
    stats = recordAnswer(stats, 'q', true, 2)
    expect(inReview(stats.q, false)).toBe(true)
    stats = recordAnswer(stats, 'q', true, 3)
    expect(inReview(stats.q, false)).toBe(false)
    expect(stats.q).toEqual({ seen: 3, correct: 2, streak: 2, lastCorrect: true, lastAt: 3 })
  })

  it('un fallo reinicia la racha', () => {
    let stats: Stats = {}
    for (const ok of [false, true, false, true]) stats = recordAnswer(stats, 'q', ok, 1)
    expect(inReview(stats.q, false)).toBe(true)
  })

  it('las nunca falladas no están en repaso, salvo que estén marcadas', () => {
    const stats = recordAnswer({}, 'q', true, 1)
    expect(inReview(stats.q, false)).toBe(false)
    expect(inReview(undefined, false)).toBe(false)
    expect(inReview(stats.q, true)).toBe(true)
  })
})
