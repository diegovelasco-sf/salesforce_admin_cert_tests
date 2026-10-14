import { expect, it } from 'vitest'
import { toggleSelection } from './selection.ts'

it('en las de una respuesta sustituye la selección', () => {
  expect(toggleSelection(['A'], 'B', 1)).toEqual(['B'])
})

it('en las de varias alterna y no deja pasar de max', () => {
  expect(toggleSelection([], 'A', 2)).toEqual(['A'])
  expect(toggleSelection(['A'], 'C', 2)).toEqual(['A', 'C'])
  expect(toggleSelection(['A', 'C'], 'D', 2)).toEqual(['A', 'C'])
  expect(toggleSelection(['A', 'C'], 'A', 2)).toEqual(['C'])
})
