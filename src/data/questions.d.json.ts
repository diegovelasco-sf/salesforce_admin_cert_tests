// Tipos de questions.json (lo genera scripts/build-bank.ts). Evita que TypeScript infiera el tipo del JSON entero.
import type { Bank } from '../domain/types.ts'

declare const bank: Bank
export default bank
