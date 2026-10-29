// Los bancos que carga la app: cada certificación solo ve sus preguntas, y nunca se mezclan.
import { describe, expect, it } from 'vitest'
import { CERTS } from '../domain/certs.ts'
import type { CertId } from '../domain/types.ts'
import { CERT_DATA } from './bank.ts'

const IDS: CertId[] = ['admin', 'appbuilder']

describe.each(IDS)('banco de %s', (id) => {
  const { cert, bank, byId } = CERT_DATA[id]

  it('todas sus preguntas son de una sección de su examen', () => {
    const sections = new Set(cert.sections.map((s) => s.key))
    expect(bank.questions.filter((q) => !sections.has(q.section)).map((q) => q.id)).toEqual([])
  })

  it('todas sus preguntas vienen de fuentes de esta certificación', () => {
    const adminSources = new Set(['crt101', 'adx201', 'trailhead', 'freecram', 'success4exam', 'debrief'])
    const isAdminSource = (source: string) => adminSources.has(source)
    for (const q of bank.questions) expect(isAdminSource(q.source)).toBe(id === 'admin')
  })

  it('sus ids son únicos y están todos en el índice', () => {
    expect(new Set(bank.questions.map((q) => q.id)).size).toBe(bank.questions.length)
    expect(byId.size).toBe(bank.questions.length)
  })
})

describe('independencia entre certificaciones', () => {
  it('ningún id está en los dos bancos', () => {
    const admin = new Set(CERT_DATA.admin.bank.questions.map((q) => q.id))
    expect(CERT_DATA.appbuilder.bank.questions.filter((q) => admin.has(q.id)).map((q) => q.id)).toEqual([])
  })

  it('los ids de App Builder llevan el prefijo ab-, y los de Administrator no', () => {
    expect(CERT_DATA.appbuilder.bank.questions.filter((q) => !q.id.startsWith('ab-')).map((q) => q.id)).toEqual([])
    expect(CERT_DATA.admin.bank.questions.filter((q) => q.id.startsWith('ab-')).map((q) => q.id)).toEqual([])
  })

  it('las secciones de una certificación no se parecen a las de la otra', () => {
    const admin = new Set(CERTS.admin.sections.map((s) => s.key))
    expect(CERTS.appbuilder.sections.filter((s) => admin.has(s.key))).toEqual([])
  })

  it('cada examen tiene sus reglas', () => {
    expect(CERTS.admin.sections).toHaveLength(8)
    expect(CERTS.appbuilder.sections).toHaveLength(5)
    expect(CERTS.admin.exam.passPercent).toBe(68)
    expect(CERTS.appbuilder.exam.passPercent).toBe(73)
    expect(CERTS.appbuilder.officialSources).toEqual([])
    for (const cert of Object.values(CERTS)) {
      expect(cert.sections.reduce((sum, s) => sum + s.weight, 0)).toBe(100)
      expect(cert.exam).toMatchObject({ questionCount: 65, scoredCount: 60, durationMinutes: 105 })
    }
  })
})
