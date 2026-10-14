// Parser del CRT101 (Student Guide de Trailhead Academy): 20 preguntas de repaso en las
// págs. 85-104, una por página y repetida (diapositiva de pregunta y de solución), y la
// clave en texto en las págs. 110-112, con enlaces "Links to Learn More".
import type { LearnMore, Option, ParsedQuestion } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { assertClean, canonical, fail, isPageNumber, joinLines, nextLetter, normalizeText } from './normalize.ts'

const QUESTION_COUNT = 20
const FIRST_QUESTION_PAGE = 85
const KEY_PAGES = [110, 111, 112]
const CHOOSE_TWO = /\(\s*Choose two answers\.?\s*\)/i
const KEY_HEADERS = new Set([
  'Review Questions',
  'Answers and Resources',
  'Appendix',
  'Review questions answers',
  'Question # Answer Links to Learn More',
])

interface KeyRow {
  correct: string[]
  text: string
}

export function parseCrt101(pages: RawPage[]): ParsedQuestion[] {
  const rows = parseKey(pages)
  const links = assignLinks(pages, rows)
  const multi = new Set<number>()

  const questions = rows.map((row, i): ParsedQuestion => {
    const n = i + 1
    const where = `CRT101 Q${n}`
    const page = pages[FIRST_QUESTION_PAGE + n - 2]
    const copies = splitCopies(page.text, n).map((lines) => parseCopy(lines, where))
    if (copies.length !== 2) fail(`${where}: se esperaban 2 copias en la pág. ${page.page} y hay ${copies.length}`)
    if (JSON.stringify(copies[0]) !== JSON.stringify(copies[1])) fail(`${where}: las dos copias no coinciden`)

    let { stem } = copies[0]
    if (CHOOSE_TWO.test(stem)) {
      multi.add(n)
      stem = stem.replace(CHOOSE_TWO, '').replace(/\s+/g, ' ').trim()
    }
    const { options } = copies[0]
    for (const key of row.correct) {
      if (!options.some((o) => o.key === key)) fail(`${where}: la respuesta ${key} no es una opción`)
    }
    assertClean(stem, where)
    options.forEach((o) => assertClean(o.text, `${where} ${o.key}`))

    return {
      id: `crt-${String(n).padStart(2, '0')}`,
      source: 'crt101',
      ref: `Q${n}`,
      stem,
      options,
      correct: row.correct,
      shuffle: true,
      learnMore: links[i],
    }
  })

  const keyMulti = rows.flatMap((row, i) => (row.correct.length > 1 ? [i + 1] : []))
  if (keyMulti.join() !== [...multi].join()) {
    fail(`CRT101: la clave tiene varias respuestas en ${keyMulti.join()} pero "Choose two" aparece en ${[...multi].join()}`)
  }
  return questions
}

/** Líneas de cada copia de la pregunta n, sin la cabecera "Lesson Review / Question n/20". */
function splitCopies(text: string, n: number): string[][] {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isPageNumber(line))
  const starts = lines.flatMap((line, i) => (line === 'Lesson Review' && lines[i + 1] === `Question ${n}/20` ? [i] : []))
  return starts.map((start, k) => lines.slice(start + 2, starts[k + 1] ?? lines.length))
}

function parseCopy(lines: string[], where: string): { stem: string; options: Option[] } {
  const stemLines: string[] = []
  const optionLines: { key: string; lines: string[] }[] = []
  let expected = 'A'
  for (const line of lines) {
    const option = /^([A-D])\.\s+(.*)$/.exec(line)
    if (option && option[1] === expected) {
      optionLines.push({ key: option[1], lines: [option[2]] })
      expected = nextLetter(expected)
    } else if (optionLines.length) optionLines.at(-1)!.lines.push(line)
    else stemLines.push(line)
  }
  if (optionLines.length !== 4) fail(`${where}: se esperaban 4 opciones y hay ${optionLines.length}`)
  return {
    stem: joinLines(stemLines),
    options: optionLines.map(({ key, lines }) => ({ key, text: joinLines(lines) })),
  }
}

/** Filas "N C & D títulos…". Una fila solo empieza si su N es el siguiente esperado. */
function parseKey(pages: RawPage[]): KeyRow[] {
  const rows: KeyRow[] = []
  for (const pageNumber of KEY_PAGES) {
    for (const raw of normalizeText(pages[pageNumber - 1].text).split('\n')) {
      const line = raw.trim()
      if (!line || KEY_HEADERS.has(line) || isPageNumber(line)) continue
      const row = /^(\d{1,2}) ([A-D](?: & [A-D])*) (.*)$/.exec(line)
      if (row && Number(row[1]) === rows.length + 1) rows.push({ correct: row[2].split(' & '), text: row[3] })
      else if (rows.length) rows.at(-1)!.text += ' ' + line
      else fail(`CRT101: línea inesperada antes de la clave: "${line}"`)
    }
  }
  if (rows.length !== QUESTION_COUNT) fail(`CRT101: la clave tiene ${rows.length} filas`)
  return rows
}

/**
 * Reparte los enlaces de las págs. de la clave entre sus filas. Se recorren de arriba abajo y cada
 * enlace va a la primera fila (desde la actual) cuyo texto lo contiene; un título partido en dos
 * anotaciones con la misma URL se une.
 */
function assignLinks(pages: RawPage[], rows: KeyRow[]): LearnMore[][] {
  const links: { url: string; title: string }[] = []
  for (const pageNumber of KEY_PAGES) {
    const sorted = [...pages[pageNumber - 1].links].sort((a, b) => b.y - a.y)
    for (const link of sorted) {
      const title = normalizeText(link.text).replace(/\s+/g, ' ').trim()
      const last = links.at(-1)
      if (last && last.url === link.url) last.title += ' ' + title
      else links.push({ url: link.url, title })
    }
  }

  const remaining = rows.map((row) => canonical(row.text))
  const result: LearnMore[][] = rows.map(() => [])
  let row = 0
  for (const link of links) {
    const needle = canonical(link.title)
    while (row < rows.length && !remaining[row].includes(needle)) row++
    if (row === rows.length) fail(`CRT101: no encuentro en la clave el enlace "${link.title}"`)
    remaining[row] = remaining[row].replace(needle, '')
    result[row].push({ title: link.title, url: link.url })
  }
  return result
}
