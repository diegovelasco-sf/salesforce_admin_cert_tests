// Preguntas de prueba para los tests.
import { CERTS, type CertConfig } from './certs.ts'
import type { Bank, Question, SectionKey } from './types.ts'

export function makeQuestion(id: string, section: SectionKey = 'config', extra: Partial<Question> = {}): Question {
  return {
    id,
    source: 'freecram',
    ref: id,
    section,
    stem: `Stem ${id}`,
    options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: `Option ${key}` })),
    correct: ['A'],
    shuffle: true,
    review: 'ok',
    learnMore: [],
    ...extra,
  }
}

/** Banco con `perSection` preguntas en cada sección de `cert` (por defecto, Platform Administrator). */
export const makeBank = (perSection = 20, hash = 'test', cert: CertConfig = CERTS.admin): Bank => ({
  hash,
  questions: cert.sections.flatMap((s) => Array.from({ length: perSection }, (_, i) => makeQuestion(`${s.key}-${i}`, s.key))),
})
