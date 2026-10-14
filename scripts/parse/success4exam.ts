// Parser de Success4Exam ("Platform Administrator-Practice Test 2.pdf"): bloques "Question N" con
// "Options:", opciones "A- …", "Correct Answer:" y una explicación que se guarda solo como referencia.
import type { Option, ParsedQuestion } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { assertClean, fail, isPageNumber, joinLines, nextLetter, normalizeText, visualLines } from './normalize.ts'

const NOISE = new Set([
  'Salesforce Certified Platform Administrator – Practice Test',
  'https://success4exam.com/',
  'More practice tests at www.success4exam.com',
  'Good luck on your exam!',
])

interface Block {
  n: number
  lines: string[]
}

export function parseSuccess4exam(pages: RawPage[]): ParsedQuestion[] {
  // Las páginas 1 y 2 son la portada y la bienvenida. El orden interno del PDF falla en algunas
  // opciones, así que se lee en orden visual.
  const lines = pages
    .slice(2)
    .flatMap(visualLines)
    .map((line) => normalizeText(line).trim())
    .filter((line) => line && !NOISE.has(line) && !isPageNumber(line))

  const blocks: Block[] = []
  for (const line of lines) {
    const start = /^Question (\d+)$/.exec(line)
    if (start) blocks.push({ n: Number(start[1]), lines: [] })
    else if (blocks.length) blocks.at(-1)!.lines.push(line)
    else fail(`Success4Exam: texto antes de la pregunta 1: "${line}"`)
  }
  blocks.forEach((block, i) => {
    if (block.n !== i + 1) fail(`Success4Exam: se esperaba la pregunta ${i + 1} y aparece la ${block.n}`)
  })
  return blocks.map(parseBlock)
}

function parseBlock({ n, lines }: Block): ParsedQuestion {
  const where = `Success4Exam Q${n}`
  const optionsAt = lines.indexOf('Options:')
  const answerAt = lines.findIndex((line) => line.startsWith('Correct Answer:'))
  if (optionsAt < 0 || answerAt < optionsAt) fail(`${where}: faltan "Options:" o "Correct Answer:"`)

  // "Choose 2 answers." va en una línea aparte: no forma parte del enunciado, pero debe cuadrar con la clave.
  const choose = lines.slice(0, optionsAt).map((line) => /^Choose (\d) answers\.?$/.exec(line)).find(Boolean)
  const stem = joinLines(lines.slice(0, optionsAt).filter((line) => !/^Choose \d answers\.?$/.test(line)))

  // Una línea abre opción solo si empieza por la letra siguiente; si no, continúa la anterior.
  const optionLines: { key: string; lines: string[] }[] = []
  let expected = 'A'
  for (const line of lines.slice(optionsAt + 1, answerAt)) {
    const option = /^([A-F])- (.*)$/.exec(line)
    if (option && option[1] === expected) {
      optionLines.push({ key: option[1], lines: [option[2]] })
      expected = nextLetter(expected)
    } else if (optionLines.length) optionLines.at(-1)!.lines.push(line)
    else fail(`${where}: texto antes de la opción A: "${line}"`)
  }
  const options: Option[] = optionLines.map(({ key, lines }) => ({ key, text: joinLines(lines) }))
  const correct = lines[answerAt]
    .replace(/^Correct Answer:\s*/, '')
    .split(/[\s,]+/)
    .filter(Boolean)

  if (options.length < 3) fail(`${where}: solo ${options.length} opciones`)
  for (const key of correct) {
    if (!options.some((o) => o.key === key)) fail(`${where}: la respuesta ${key} no es una opción`)
  }
  if (choose && Number(choose[1]) !== correct.length) {
    fail(`${where}: pide ${choose[1]} respuestas y la clave tiene ${correct.length}`)
  }
  assertClean(stem, where)
  options.forEach((o) => assertClean(o.text, `${where} ${o.key}`))

  const explanation = joinLines(lines.slice(answerAt + 1).filter((line) => line !== 'Overall Explanation:'))
  return {
    id: `s4e-${String(n).padStart(3, '0')}`,
    source: 'success4exam',
    ref: `Q${n}`,
    stem,
    options,
    correct,
    shuffle: true,
    learnMore: [],
    ...(explanation ? { sourceExplanation: explanation } : {}),
  }
}
