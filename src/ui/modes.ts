// Helpers de los modos que comparten varias pantallas (fuentes y paquetes de estudio).
import type { Dispatch } from 'react'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { questionSources } from '../domain/sampling.ts'
import { SOURCE_LABELS } from '../domain/exam.ts'
import type { Progress } from '../domain/storage.ts'
import { packQuestions, type PackFilter } from '../domain/study.ts'
import type { Question, SourceId } from '../domain/types.ts'
import { makeRun, type Action } from './state.ts'

/** Fuentes que tienen preguntas en el banco, en el orden de SOURCE_LABELS. */
export function bankSources(questions: readonly Question[]): SourceId[] {
  const present = new Set(questions.flatMap(questionSources))
  return (Object.keys(SOURCE_LABELS) as SourceId[]).filter((s) => present.has(s))
}

/** undefined (todas) si están todas elegidas, para que una fuente nueva entre sola. */
export const normalizeSources = (chosen: readonly SourceId[], all: readonly SourceId[]): SourceId[] | undefined =>
  all.every((s) => chosen.includes(s)) ? undefined : all.filter((s) => chosen.includes(s))

/** Inicia la tanda de un paquete. La usan la lista de paquetes y el resumen al acabar uno. */
export function startPack(dispatch: Dispatch<Action>, progress: Progress, index: number, filter: PackFilter, byId: (id: string) => Question): void {
  const plan = progress.study
  if (!plan?.packs[index]) return
  const ids = packQuestions(plan.packs[index], filter, plan.stats, progress.flagged)
  if (!ids.length) return
  const rng = mulberry32(randomSeed())
  dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('study', ids.map(byId), rng, index) } })
}
