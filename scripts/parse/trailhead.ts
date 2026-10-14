// Parser del módulo de Trailhead "Administrator Certification Prep: Configuration, Setup and Objects".
// Los escenarios son tablas: letra, opción en MAYÚSCULAS y "Correct."/"Incorrect." con la explicación.
// La clave sale de esa marca; las opciones se muestran con la grafía de data/manual/trailhead.json,
// que debe coincidir palabra por palabra con el texto en mayúsculas. Las tarjetas de repaso que son
// preguntas se transcriben aparte, en el mismo fichero.
import type { ParsedQuestion } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { manualQuestions, type ManualQuestion } from './manual.ts'
import { assertClean, canonical, fail, isPageNumber, joinLines, nextLetter, normalizeText } from './normalize.ts'

export interface TrailheadManual {
  /** "th-u2-01:A" → texto de la opción con mayúsculas normales. */
  casing: Record<string, string>
  questions: ManualQuestion[]
}

const HEADER = 'Trailhead Document'
const VERDICT = /^(Correct|Incorrect)\.(?:\s|$)/
/** Opción con letra: "A BUSINESS HOURS," o "C ASSIGNED APPS Correct. Profiles…". */
const LETTERED = /^([A-E]) (.+)$/
/** Quinta opción sin letra, siempre con su veredicto en la misma línea: "LOCALE SETTINGS Incorrect." */
const UNLETTERED = /^([^a-z]+?) ((?:Correct|Incorrect)\..*)$/

interface Draft {
  key: string
  lines: string[]
  verdict?: 'Correct' | 'Incorrect'
}

const isUpper = (text: string): boolean => !/[a-z]/.test(text)

/** Separa "TEXTO EN MAYÚSCULAS Correct. explicación" en sus dos partes. */
function splitVerdict(text: string): { option: string; verdict?: 'Correct' | 'Incorrect' } {
  const at = text.search(/ (?:Correct|Incorrect)\.(?:\s|$)/)
  if (at < 0) return { option: text }
  return { option: text.slice(0, at), verdict: text.slice(at + 1).startsWith('Correct') ? 'Correct' : 'Incorrect' }
}

export interface RawScenario {
  id: string
  ref: string
  stem: string
  options: { key: string; source: string; correct: boolean }[]
}

export function parseTrailhead(pages: RawPage[], manual: TrailheadManual): ParsedQuestion[] {
  const parsed = readScenarios(pages).map((s) => withCasing(s, manual.casing))
  const used = new Set(parsed.flatMap((q) => q.options.map((o) => `${q.id}:${o.key}`)))
  for (const key of Object.keys(manual.casing)) if (!used.has(key)) fail(`Trailhead: grafía para una opción que no existe: ${key}`)
  return [...parsed, ...manualQuestions('trailhead', pages, manual.questions)]
}

/** Escenarios tal como vienen: enunciado, opciones en mayúsculas y cuáles son correctas. */
export function readScenarios(pages: RawPage[]): RawScenario[] {
  const lines = pages
    .flatMap((page) => normalizeText(page.text).split('\n'))
    .map((line) => line.trim())
    .filter((line) => line && line !== HEADER && !isPageNumber(line))

  const scenarios: { id: string; ref: string; lines: string[] }[] = []
  let unit = 0
  let open = false
  for (const line of lines) {
    const unitMatch = /^Unit (\d):/.exec(line)
    const scenario = /^Scenario (\d+)$/.exec(line)
    if (unitMatch) {
      unit = Number(unitMatch[1])
      open = false
    } else if (scenario) {
      const n = Number(scenario[1])
      const expected = scenarios.filter((s) => s.id.startsWith(`th-u${unit}-`)).length + 1
      if (n !== expected) fail(`Trailhead: en la unidad ${unit} se esperaba el escenario ${expected} y aparece el ${n}`)
      scenarios.push({ id: `th-u${unit}-${String(n).padStart(2, '0')}`, ref: `U${unit} E${n}`, lines: [] })
      open = true
    } else if (line === 'Exam Topic Flashcards') open = false
    else if (open) scenarios.at(-1)!.lines.push(line)
  }

  return scenarios.map((s) => readScenario(s.id, s.ref, s.lines))
}

function readScenario(id: string, ref: string, lines: string[]): RawScenario {
  const where = `Trailhead ${id}`
  const stemLines: string[] = []
  const drafts: Draft[] = []
  for (const line of lines) {
    const current = drafts.at(-1)
    const lettered = LETTERED.exec(line)
    const expected = current ? nextLetter(current.key) : 'A'
    if (lettered && lettered[1] === expected && isUpper(splitVerdict(lettered[2]).option)) {
      const { option, verdict } = splitVerdict(lettered[2])
      drafts.push({ key: expected, lines: [option], verdict })
    } else if (!current) stemLines.push(line)
    else if (!current.verdict) {
      // Aún dentro del texto de la opción: o sigue en mayúsculas o empieza el veredicto.
      const verdict = VERDICT.exec(line)
      if (verdict) current.verdict = verdict[1] as Draft['verdict']
      else {
        const split = splitVerdict(line)
        if (!isUpper(split.option)) fail(`${where} ${current.key}: línea inesperada en la opción: "${line}"`)
        current.lines.push(split.option)
        current.verdict = split.verdict
      }
    } else {
      const unlettered = UNLETTERED.exec(line)
      if (unlettered && isUpper(unlettered[1])) {
        drafts.push({ key: expected, lines: [unlettered[1]], verdict: unlettered[2].startsWith('Correct') ? 'Correct' : 'Incorrect' })
      } else if (/[A-Z]/.test(line) && isUpper(line)) {
        // Fila partida por un salto de página: el resto de la opción llega después de su explicación.
        current.lines.push(line)
      }
      // Si no, es la explicación de la opción actual: no se guarda.
    }
  }

  if (drafts.length < 3) fail(`${where}: solo ${drafts.length} opciones`)
  for (const draft of drafts) if (!draft.verdict) fail(`${where} ${draft.key}: falta "Correct." o "Incorrect."`)
  const stem = joinLines(stemLines).replace(/\s*\(Choose (?:two|three) answers\.\)$/, '')
  assertClean(stem, where)
  return {
    id,
    ref,
    stem,
    options: drafts.map((d) => ({ key: d.key, source: joinLines(d.lines), correct: d.verdict === 'Correct' })),
  }
}

/** Aplica la grafía de cada opción, que debe tener las mismas palabras que el texto en mayúsculas. */
function withCasing(scenario: RawScenario, casing: Record<string, string>): ParsedQuestion {
  const options = scenario.options.map(({ key, source }) => {
    const where = `Trailhead ${scenario.id} ${key}`
    const text = casing[`${scenario.id}:${key}`]
    if (text === undefined) fail(`${where}: falta su grafía en data/manual/trailhead.json ("${source}")`)
    if (canonical(text) !== canonical(source)) fail(`${where}: la grafía "${text}" no coincide con "${source}"`)
    assertClean(text, where)
    return { key, text }
  })
  return {
    id: scenario.id,
    source: 'trailhead',
    ref: scenario.ref,
    stem: scenario.stem,
    options,
    correct: scenario.options.filter((o) => o.correct).map((o) => o.key),
    shuffle: true,
    learnMore: [],
  }
}
