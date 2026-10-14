// Preguntas transcritas a mano en data/manual/<fuente>.json, para fuentes que no se pueden leer
// automáticamente (sin opciones o con un formato irregular). Cada pregunta trae citas literales de la
// fuente, que deben aparecer en su texto: así la transcripción queda ligada al PDF.
import type { Option, ParsedQuestion, SourceId } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { assertClean, canonical, fail, nextLetter } from './normalize.ts'

export interface ManualQuestion {
  id: string
  ref: string
  stem: string
  options: Option[]
  /** Clave según la fuente; si la fuente se equivoca, se corrige en la curación. */
  correct: string[]
  shuffle?: boolean
  /** Fragmentos literales de la fuente (enunciado, respuesta…), comparados en forma canónica. */
  quotes: string[]
  /** La fuente solo trae la pregunta y la respuesta: el resto de opciones se han redactado aparte. */
  authoredOptions?: boolean
}

/** Texto canónico de todas las páginas, con las líneas unidas por espacios. */
export const canonicalText = (pages: RawPage[]): string => canonical(pages.map((page) => page.text).join('\n'))

export function manualQuestions(source: SourceId, pages: RawPage[], questions: ManualQuestion[]): ParsedQuestion[] {
  const text = canonicalText(pages)
  return questions.map((q) => {
    const where = `${source} ${q.id}`
    if (!q.quotes.length) fail(`${where}: sin citas de la fuente`)
    for (const quote of q.quotes) {
      if (!text.includes(canonical(quote))) fail(`${where}: la cita no aparece en la fuente: "${quote.slice(0, 80)}"`)
    }
    let expected = 'A'
    for (const option of q.options) {
      if (option.key !== expected) fail(`${where}: se esperaba la opción ${expected} y aparece ${option.key}`)
      expected = nextLetter(expected)
      assertClean(option.text, `${where} ${option.key}`)
    }
    for (const key of q.correct) if (!q.options.some((o) => o.key === key)) fail(`${where}: la respuesta ${key} no es una opción`)
    assertClean(q.stem, where)
    return {
      id: q.id,
      source,
      ref: q.ref,
      stem: q.stem,
      options: q.options.map((o) => ({ ...o })),
      correct: [...q.correct],
      shuffle: q.shuffle ?? true,
      learnMore: [],
      ...(q.authoredOptions ? { authoredOptions: true } : {}),
    }
  })
}
