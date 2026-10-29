// Todo lo que la app necesita de una certificación: sus reglas, su banco y el índice de sus preguntas.
// Cada certificación tiene el suyo y nunca se mezclan: una pregunta solo se busca en el banco de su examen.
import type { CertConfig } from '../domain/certs.ts'
import type { Bank, Question } from '../domain/types.ts'

export interface CertData {
  cert: CertConfig
  bank: Bank
  byId: ReadonlyMap<string, Question>
  /** Pregunta de esta certificación; lanza si el id no es de su banco. */
  question: (id: string) => Question
}

export function makeCertData(cert: CertConfig, bank: Bank): CertData {
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  return {
    cert,
    bank,
    byId,
    question(id) {
      const found = byId.get(id)
      if (!found) throw new Error(`Pregunta desconocida para ${cert.name}: ${id}`)
      return found
    },
  }
}
