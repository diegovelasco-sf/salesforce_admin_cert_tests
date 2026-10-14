// Parser del ADX201 (Student Guide de Trailhead Academy): 4 preguntas de repaso al final de
// cada una de las 11 lecciones. Cada pregunta sale dos veces (pregunta y revelado) y la
// respuesta correcta solo se ve en la imagen, así que la clave está en data/answers/adx201.json.
import type { Option, ParsedQuestion } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { assertClean, canonical, fail, isPageNumber, joinLines, nextLetter, normalizeText } from './normalize.ts'

const LESSONS = 11
const PER_LESSON = 4

/** L4 Q3: en la primera copia una línea de la opción D sale desordenada; la segunda está bien. */
const USE_SECOND_COPY = new Set(['adx-04-3'])

/** Por lección, la respuesta de cada pregunta: "B", o "B=False" en las de verdadero/falso. */
export type AdxAnswers = Record<string, string[]>

interface Copy {
  number?: number
  lines: string[]
}

interface Parsed {
  stem: string
  options: Option[]
}

export function parseAdx201(pages: RawPage[], answers: AdxAnswers): ParsedQuestion[] {
  const lines = pages
    .flatMap((page) => normalizeText(page.text).split('\n'))
    .map((line) => line.trim())
    .filter((line) => line && !isPageNumber(line))

  // Agrupa las copias por enunciado, en orden de primera aparición.
  const groups = new Map<string, { copies: Parsed[]; numbers: (number | undefined)[] }>()
  for (const copy of collectCopies(lines)) {
    const parsed = parseCopy(copy.lines)
    if (!parsed) continue
    const key = canonical(parsed.stem)
    const group = groups.get(key) ?? { copies: [], numbers: [] }
    group.copies.push(parsed)
    group.numbers.push(copy.number)
    groups.set(key, group)
  }
  if (groups.size !== LESSONS * PER_LESSON) fail(`ADX201: se esperaban ${LESSONS * PER_LESSON} preguntas y hay ${groups.size}`)

  return [...groups.values()].map((group, i) => {
    const lesson = Math.floor(i / PER_LESSON) + 1
    const q = (i % PER_LESSON) + 1
    const id = `adx-${String(lesson).padStart(2, '0')}-${q}`
    const where = `ADX201 L${lesson} Q${q}`

    for (const number of group.numbers) {
      if (number !== undefined && number !== q) fail(`${where}: la cabecera dice "Question ${number}/4"`)
    }
    if (group.copies.length !== 2) fail(`${where}: se esperaban 2 copias y hay ${group.copies.length}`)
    const [first, second] = group.copies
    const sameCopies = JSON.stringify(first) === JSON.stringify(second)
    if (USE_SECOND_COPY.has(id) === sameCopies) {
      fail(`${where}: ${sameCopies ? 'las copias ya coinciden; quita el caso especial' : 'las dos copias no coinciden'}`)
    }
    const { stem, options } = USE_SECOND_COPY.has(id) ? second : first

    const answer = answers[`L${lesson}`]?.[q - 1] ?? fail(`${where}: falta en la clave`)
    const [letter, trueFalse] = answer.split('=')
    const chosen = options.find((o) => o.key === letter) ?? fail(`${where}: la respuesta ${letter} no es una opción`)
    if (trueFalse && canonical(chosen.text) !== canonical(trueFalse)) {
      fail(`${where}: la clave dice ${trueFalse} pero la opción ${letter} es "${chosen.text}"`)
    }

    assertClean(stem, where)
    options.forEach((o) => assertClean(o.text, `${where} ${o.key}`))
    return transform({ id, source: 'adx201', ref: `L${lesson} Q${q}`, stem, options, correct: [letter], shuffle: true, learnMore: [] })
  })
}

/**
 * Corta el flujo de líneas en copias de pregunta. Una copia empieza en una cabecera
 * ("Lesson Review Question 1/4", la misma en dos líneas, o "Lesson Review" a secas) y acaba en
 * la siguiente cabecera, en el separador "Lesson" / "Review" o en "That's a wrap!".
 */
function collectCopies(lines: string[]): Copy[] {
  const copies: Copy[] = []
  let current: Copy | undefined
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const inline = /^Lesson Review Question (\d)\/4$/.exec(line)
    const split = line === 'Lesson Review' ? /^Question (\d)\/4$/.exec(lines[i + 1] ?? '') : null
    if (inline || line === 'Lesson Review') {
      current = { number: inline ? Number(inline[1]) : split ? Number(split[1]) : undefined, lines: [] }
      copies.push(current)
      if (split) i++
    } else if ((line === 'Lesson' && lines[i + 1] === 'Review') || /^That.s a wrap!/.test(line)) {
      current = undefined
    } else current?.lines.push(line)
  }
  return copies
}

/** Enunciado y opciones ("A: " o "A. "); undefined si la copia no tiene forma de pregunta. */
function parseCopy(lines: string[]): Parsed | undefined {
  const stemLines: string[] = []
  const optionLines: { key: string; lines: string[] }[] = []
  let expected = 'A'
  for (const line of lines) {
    const option = /^([A-E])[:.]\s+(.*)$/.exec(line)
    if (option && option[1] === expected) {
      optionLines.push({ key: option[1], lines: [option[2]] })
      expected = nextLetter(expected)
    } else if (optionLines.length) optionLines.at(-1)!.lines.push(line)
    else stemLines.push(line)
  }
  if (optionLines.length < 2 || !stemLines.length) return undefined
  return {
    stem: joinLines(stemLines),
    options: optionLines.map(({ key, lines }) => ({ key, text: joinLines(lines) })),
  }
}

/**
 * Ajustes para que las preguntas funcionen barajadas y no regalen la respuesta:
 * - "E: A and B (…)" pasa a ser "Elige 2" con A y B, porque la opción combinada siempre era la correcta.
 * - "All of the above" se queda fija al final.
 * - Las de verdadero/falso no se barajan.
 */
function transform(question: ParsedQuestion): ParsedQuestion {
  const combined = question.options.find((o) => /^[A-E] and [A-E]\b/.test(o.text))
  if (combined) {
    const [, a, b] = /^([A-E]) and ([A-E])\b/.exec(combined.text)!
    question.options = question.options.filter((o) => o !== combined)
    if (question.correct.includes(combined.key)) question.correct = [a, b]
  }
  for (const option of question.options) {
    if (/^all of the above/i.test(option.text)) option.pinned = true
  }
  const texts = question.options.map((o) => canonical(o.text)).join('|')
  if (texts === 'true|false') question.shuffle = false
  return question
}
