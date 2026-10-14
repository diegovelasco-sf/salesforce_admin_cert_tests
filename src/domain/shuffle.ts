import type { Rng } from './rng.ts'
import type { Question } from './types.ts'

/** Fisher-Yates: devuelve una copia barajada. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Orden en que se muestran las opciones, por clave. Las fijadas ("All of the above") van al final. */
export function optionOrder(question: Question, rng: Rng): string[] {
  if (!question.shuffle) return question.options.map((o) => o.key)
  const free = question.options.filter((o) => !o.pinned).map((o) => o.key)
  const pinned = question.options.filter((o) => o.pinned).map((o) => o.key)
  return [...shuffle(free, rng), ...pinned]
}

/** Letra que ve el usuario para la posición i ("A", "B"…). */
export const displayLetter = (index: number): string => String.fromCharCode(65 + index)
