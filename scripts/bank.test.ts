import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CertId } from '../src/domain/types.ts'
import { PENDING_BANK, buildBank, isPending } from './bank.ts'
import { BANK_PATHS } from './paths.ts'

const readBank = (cert: CertId) => JSON.parse(readFileSync(BANK_PATHS[cert], 'utf8'))

describe('banco de Platform Administrator', () => {
  const { bank, errors } = buildBank({ cert: 'admin', strict: true })

  it('pasa todas las validaciones, con explicación y revisión en cada pregunta', () => {
    expect(errors).toEqual([])
  })

  it('src/data/questions.json está al día', () => {
    expect(readBank('admin')).toEqual(bank)
  })

  it('ids únicos y estables, y ninguno es de App Builder', () => {
    const ids = bank.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^(fc-\d{3}|crt-\d{2}|adx-\d{2}-\d|s4e-\d{3}|th-u\d-f?\d{2}|dbf-\d{3})$/)
  })
})

describe('banco de Platform App Builder', () => {
  const { bank, errors } = buildBank({ cert: 'appbuilder', strict: true })

  it('pasa todas las validaciones (o está en preparación, sin curación)', () => {
    expect(errors).toEqual([])
  })

  it('src/data/appbuilder.json está al día', () => {
    expect(readBank('appbuilder')).toEqual(bank)
  })

  it('ids únicos y estables, y todos son de App Builder', () => {
    const ids = bank.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^ab-(v2335|s4e|fc143|fc108|fc35)-\d{3}$/)
  })

  it('mientras no tiene curación, es un banco vacío «en preparación» y no una mezcla a medias', () => {
    if (isPending('appbuilder')) expect(bank).toEqual(PENDING_BANK)
    else expect(bank.questions.length).toBeGreaterThan(0)
  })
})

describe('banco de Platform Developer I', () => {
  const { bank, errors } = buildBank({ cert: 'developer', strict: true })

  it('pasa todas las validaciones (o está en preparación, sin curación)', () => {
    expect(errors).toEqual([])
  })

  it('src/data/developer.json está al día', () => {
    expect(readBank('developer')).toEqual(bank)
  })

  it('mientras no tiene curación, es un banco vacío «en preparación»', () => {
    if (isPending('developer')) expect(bank).toEqual(PENDING_BANK)
    else expect(bank.questions.length).toBeGreaterThan(0)
  })
})

describe('independencia de los bancos', () => {
  it('ningún id ni ninguna fuente aparece en dos certificaciones', () => {
    const banks = (['admin', 'appbuilder', 'developer'] as const).map((cert) => buildBank({ cert }).bank.questions)
    const ids = banks.flatMap((questions) => questions.map((q) => q.id))
    expect(new Set(ids).size).toBe(ids.length)
    // cada fuente pertenece a un solo banco
    const owners = new Map<string, number>()
    banks.forEach((questions, i) => questions.forEach((q) => owners.set(q.source, Math.min(owners.get(q.source) ?? i, i))))
    banks.forEach((questions, i) => questions.forEach((q) => expect(owners.get(q.source)).toBe(i)))
  })
})
