import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildBank } from './bank.ts'
import { BANK_PATH } from './paths.ts'

describe('banco de preguntas', () => {
  const { bank, errors } = buildBank({ strict: true })

  it('pasa todas las validaciones, con explicación y revisión en cada pregunta', () => {
    expect(errors).toEqual([])
  })

  it('src/data/questions.json está al día', () => {
    expect(JSON.parse(readFileSync(BANK_PATH, 'utf8'))).toEqual(bank)
  })

  it('ids únicos y estables', () => {
    const ids = bank.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^(fc-\d{3}|crt-\d{2}|adx-\d{2}-\d|s4e-\d{3}|th-u\d-f?\d{2}|dbf-\d{3})$/)
  })
})
