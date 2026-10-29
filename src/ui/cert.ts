import { createContext, useContext } from 'react'
import type { CertData } from './certdata.ts'

export const CertContext = createContext<CertData | null>(null)

/** La certificación que se está practicando: sus reglas, su banco y su índice de preguntas. */
export function useCert(): CertData {
  const data = useContext(CertContext)
  if (!data) throw new Error('useCert se usa fuera de una certificación')
  return data
}
