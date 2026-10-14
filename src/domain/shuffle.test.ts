import { describe, expect, it } from 'vitest'
import { makeQuestion } from './fixtures.ts'
import { mulberry32 } from './rng.ts'
import { displayLetter, optionOrder, shuffle } from './shuffle.ts'

describe('shuffle', () => {
  it('devuelve una permutación sin tocar el original', () => {
    const items = [1, 2, 3, 4, 5]
    const out = shuffle(items, mulberry32(1))
    expect([...out].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })
})

describe('optionOrder', () => {
  it('baraja las opciones', () => {
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => optionOrder(makeQuestion('q'), mulberry32(seed)).join('')))
    expect(orders.size).toBeGreaterThan(1)
    for (const order of orders) expect([...order].sort().join('')).toBe('ABCD')
  })

  it('deja siempre al final las opciones fijadas', () => {
    const q = makeQuestion('q')
    q.options[3].pinned = true
    for (let seed = 0; seed < 20; seed++) expect(optionOrder(q, mulberry32(seed)).at(-1)).toBe('D')
  })

  it('respeta el orden original si la pregunta no se baraja', () => {
    const q = makeQuestion('q', 'config', { shuffle: false })
    expect(optionOrder(q, mulberry32(5))).toEqual(['A', 'B', 'C', 'D'])
  })
})

it('displayLetter', () => {
  expect([0, 1, 4].map(displayLetter)).toEqual(['A', 'B', 'E'])
})
