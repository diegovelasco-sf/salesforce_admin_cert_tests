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

describe('independencia de los bancos', () => {
  it('ningún id ni ninguna fuente aparece en los dos', () => {
    const admin = buildBank({ cert: 'admin' }).bank.questions
    const appbuilder = buildBank({ cert: 'appbuilder' }).bank.questions
    const ids = new Set(admin.map((q) => q.id))
    const sources = new Set(admin.map((q) => q.source))
    expect(appbuilder.filter((q) => ids.has(q.id) || sources.has(q.source))).toEqual([])
  })
})
