/** Historial de cada pregunta: veces vista, aciertos, racha de aciertos seguidos y último resultado. */
export interface QuestionStat {
  seen: number
  correct: number
  streak: number
  lastCorrect: boolean
  lastAt: number
}

export type Stats = Record<string, QuestionStat>

export function recordAnswer(stats: Stats, id: string, ok: boolean, now: number): Stats {
  const prev = stats[id] ?? { seen: 0, correct: 0, streak: 0, lastCorrect: false, lastAt: 0 }
  return {
    ...stats,
    [id]: {
      seen: prev.seen + 1,
      correct: prev.correct + (ok ? 1 : 0),
      streak: ok ? prev.streak + 1 : 0,
      lastCorrect: ok,
      lastAt: now,
    },
  }
}

/** Para salir de Repaso hay que acertar dos veces seguidas una pregunta que se ha fallado alguna vez. */
export const REVIEW_STREAK = 2

/** Una pregunta está en Repaso si está marcada, o si se ha fallado alguna vez y aún no se ha acertado dos veces seguidas. */
export function inReview(stat: QuestionStat | undefined, flagged: boolean): boolean {
  if (flagged) return true
  return !!stat && stat.correct < stat.seen && stat.streak < REVIEW_STREAK
}
