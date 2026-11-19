import { describe, expect, it } from 'vitest'
import { CERTS } from './certs.ts'
import { neededToPass } from './grading.ts'
import { apportion } from './sampling.ts'
import { STORAGE_KEYS } from './storage.ts'

const certs = Object.values(CERTS)

// Valen para cualquier certificación, también para la provisional: si se corrige su formato, siguen en pie.
describe.each(certs)('configuración de $name', (cert) => {
  it('el id coincide con su clave, y su clave de progreso es propia', () => {
    expect(CERTS[cert.id]).toBe(cert)
    expect(new Set(Object.values(STORAGE_KEYS)).size).toBe(Object.keys(STORAGE_KEYS).length)
    expect(STORAGE_KEYS[cert.id]).toBeTruthy()
  })

  it('los pesos de las secciones suman 100', () => {
    expect(cert.sections.reduce((sum, s) => sum + s.weight, 0)).toBe(100)
  })

  it('el simulacro reparte exactamente sus preguntas entre las secciones', () => {
    const quota = apportion(cert.exam.questionCount, cert.sections.map((s) => s.weight))
    expect(quota.reduce((a, b) => a + b, 0)).toBe(cert.exam.questionCount)
    expect(quota.every((n) => n > 0)).toBe(true)
  })

  it('las preguntas que puntúan caben en el examen y la nota de corte es alcanzable', () => {
    const { exam } = cert
    expect(exam.scoredCount).toBeLessThanOrEqual(exam.questionCount)
    expect(neededToPass(exam.scoredCount, exam.passPercent)).toBeLessThanOrEqual(exam.scoredCount)
  })

  it('tiene nombre y etiqueta en español e inglés en cada sección', () => {
    expect(cert.name).toBeTruthy()
    for (const s of cert.sections) expect(s.label && s.labelEn).toBeTruthy()
  })
})

describe('secciones de todas las certificaciones', () => {
  it('ninguna clave de sección se repite entre certificaciones', () => {
    const keys = certs.flatMap((c) => c.sections.map((s) => s.key))
    expect(new Set(keys).size).toBe(keys.length)
  })
})
