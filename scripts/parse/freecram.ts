// Parser del banco de FreeCram ("ADM-201 V22.35.pdf"): bloques "NO.N" con opciones,
// "Answer:" y "Explanation:". La explicación se guarda en bruto, solo como referencia.
import type { Option, ParsedQuestion } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { assertClean, fail, isPageNumber, joinLines, nextLetter, normalizeText } from './normalize.ts'

const HEADER = 'IT Certification Guaranteed, The Easy Way!'

interface Block {
  n: number
  lines: string[]
}

export function parseFreecram(pages: RawPage[]): ParsedQuestion[] {
  // La página 1 es la portada.
  const lines = pages
    .slice(1)
    .flatMap((page) => normalizeText(page.text).split('\n'))
    .map((line) => line.trim())
    .filter((line) => line && line !== HEADER && !isPageNumber(line))

  const blocks: Block[] = []
  for (const line of lines) {
    const start = /^NO\.(\d+)\s+(.*)$/.exec(line)
    if (start) blocks.push({ n: Number(start[1]), lines: [start[2]] })
    else if (blocks.length) blocks.at(-1)!.lines.push(line)
    else fail(`FreeCram: texto antes de NO.1: "${line}"`)
  }
  blocks.forEach((block, i) => {
    if (block.n !== i + 1) fail(`FreeCram: se esperaba NO.${i + 1} y aparece NO.${block.n}`)
  })
  return blocks.map(parseBlock)
}

function parseBlock({ n, lines }: Block): ParsedQuestion {
  const where = `FreeCram NO.${n}`
  const answerAt = lines.findIndex((line) => line.startsWith('Answer:'))
  if (answerAt < 0) fail(`${where}: falta "Answer:"`)
  const explanationAt = lines.findIndex((line, i) => i > answerAt && line.startsWith('Explanation:'))

  // Una línea abre opción solo si empieza por la letra siguiente; si no, continúa la anterior.
  const stemLines: string[] = []
  const optionLines: { key: string; lines: string[] }[] = []
  let expected = 'A'
  for (const line of lines.slice(0, answerAt)) {
    const option = /^([A-F])\.\s+(.*)$/.exec(line)
    if (option && option[1] === expected) {
      optionLines.push({ key: option[1], lines: [option[2]] })
      expected = nextLetter(expected)
    } else if (optionLines.length) optionLines.at(-1)!.lines.push(line)
    else stemLines.push(line)
  }

  const stem = cleanStem(joinLines(stemLines))
  const options: Option[] = optionLines.map(({ key, lines }) => ({ key, text: cleanOption(joinLines(lines)) }))
  const correct = lines[answerAt]
    .replace(/^Answer:\s*/, '')
    .split(/[\s,]+/)
    .filter(Boolean)

  if (options.length < 3) fail(`${where}: solo ${options.length} opciones`)
  for (const key of correct) {
    if (!options.some((o) => o.key === key)) fail(`${where}: la respuesta ${key} no es una opción`)
  }
  assertClean(stem, where)
  options.forEach((o) => assertClean(o.text, `${where} ${o.key}`))

  return {
    id: `fc-${String(n).padStart(3, '0')}`,
    source: 'freecram',
    ref: `NO.${n}`,
    stem,
    options,
    correct,
    shuffle: true,
    learnMore: [],
    sourceExplanation: explanationAt >= 0 ? joinLines(lines.slice(explanationAt + 1)) : undefined,
  }
}

// Artefactos de citas pegados por la IA que generó el banco: "...reports?31", "?2424".
const cleanStem = (stem: string): string => stem.replace(/\?\d+$/, '?')

// "Approval Process1", "Flow Solutions8", "custom object.1".
const cleanOption = (text: string): string => text.replace(/([a-z])\d{1,2}$/, '$1').replace(/([a-z]\.)\d{1,2}$/, '$1')
