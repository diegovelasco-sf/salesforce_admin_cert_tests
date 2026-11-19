// Parser de los PDF de FreeCram de Platform App Builder, en dos formatos:
//  · "new": bloques "NEW QUESTION: N" (q143 y q108). Entre preguntas hay anuncios de EduDump y separadores "---".
//  · "numbered": bloques "NO.N" con pie de página en cada hoja (Platform-App-Builder.pdf).
//  · "doc": bloques "NO.N" de un documento exportado a PDF, sin pies ni anuncios. Cada cambio de fuente
//    (los guiones bajos de los campos, las fórmulas) parte la línea en fragmentos, que se recomponen por su posición.
// Las claves ocultas ("Answer: (SHOW ANSWER)") no están en el PDF: vienen de `keys`, transcritas a partir de
// la explicación. Si falta alguna, la pregunta sale sin clave y build-bank la rechaza.
import type { Option, ParsedQuestion, SourceId } from '../../src/domain/types.ts'
import type { RawPage } from '../paths.ts'
import { cleanOption, cleanStem } from './freecram.ts'
import { assertClean, fail, isPageNumber, joinLines, nextLetter, normalizeText } from './normalize.ts'

export interface FreecramFormat {
  source: SourceId
  /** Prefijo de los ids: ab-fc143 da ab-fc143-001. */
  prefix: string
  layout: 'new' | 'numbered' | 'doc'
  /** Claves que el PDF oculta, por número de pregunta. */
  keys?: Record<string, string[]>
  /** Transcripción de las imágenes del PDF (enunciados con captura u opciones que son imagen), por número. */
  images?: Record<string, ImageFix>
}

/** Lo que el texto del PDF no trae porque es una imagen: el enunciado completo y/o el texto de las opciones. */
export interface ImageFix {
  stem?: string
  options?: Record<string, string>
}

/** Cabeceras y pies de FreeCram: no son del examen. */
const NOISE: RegExp[] = [
  /^IT Certification Guaranteed, The Easy Way!$/,
  /^Free Exam\/Cram Practice Materials/,
  /^Get Latest & Valid /,
  /^https:\/\/www\.freecram\.net\//,
]
/** Portada antes de la primera pregunta: nombre del examen, versión, visitas y URL. La de V23.35 trae el título partido en dos líneas. */
const COVER = /^(Platform App Builder Exam Questions$|Salesforce\.Platform|Exam Code:|Exam Name:|Certification Provider:|Free Question Number:|Version:|# of |Exam :|Title :|Vendor :|Version :|App Builder$)/
/** Anuncio de EduDump intercalado entre preguntas: empieza y acaba con una línea conocida. */
const AD_START = /^Valid Platform-App-Builder Dumps shared by EduDump/
const AD_END = /35%OFF Special Discount Code: freecram\)/
const SEPARATOR = '---'
// En el documento revisado alguna cabecera va como "No. 233" o "No.189".
const START = { new: /^NEW QUESTION:\s*(\d+)\s*(.*)$/, numbered: /^NO\.(\d+)\s*(.*)$/, doc: /^NO\.\s*(\d+)\s*(.*)$/i } as const

interface Block {
  n: number
  lines: string[]
}

export function parseFreecram2(pages: RawPage[], format: FreecramFormat): ParsedQuestion[] {
  const blocks = splitBlocks(contentLines(pages, format.layout), START[format.layout], format.source)
  const questions = blocks.map((block) => parseBlock(block, format))
  // Todas juntas, para que una sola pasada diga qué hay que transcribir.
  const pending = questions.filter((q) => !q.stem || q.options.some((o) => !o.text)).map((q) => q.ref)
  if (pending.length) {
    fail(`${format.source}: ${pending.length} preguntas con el enunciado o las opciones en imagen sin transcribir: ${pending.join(', ')}`)
  }
  return questions
}

/** Líneas con contenido de todas las páginas, sin pies, anuncios ni separadores. */
function contentLines(pages: RawPage[], layout: FreecramFormat['layout']): string[] {
  const out: string[] = []
  let inAd = false
  for (const page of pages) {
    const rows = layout === 'doc' ? visualRows(page) : normalizeText(page.text).split('\n')
    for (const raw of rows) {
      const line = raw.trim()
      if (inAd) {
        if (AD_END.test(line)) inAd = false
        continue
      }
      if (AD_START.test(line)) {
        inAd = true
        continue
      }
      if (!line || line === SEPARATOR || isPageNumber(line) || NOISE.some((pattern) => pattern.test(line))) continue
      out.push(line)
    }
  }
  if (inAd) fail('FreeCram: anuncio de EduDump sin cerrar')
  return out
}

/** Hueco máximo, en puntos, entre dos fragmentos de una misma línea para tratarlos como una sola palabra: pegados, ~0; con un espacio, ~3. */
const GLUE_GAP = 1.5

/**
 * Filas de la página recompuestas a partir de sus fragmentos visuales. El texto interno del PDF pone cada
 * fragmento en su propia línea ("Asking Price", "_", "c and…"), lo que partiría los nombres de campo y las
 * fórmulas; aquí se unen los de una misma fila, con un espacio solo si hay hueco entre ellos.
 */
function visualRows(page: RawPage): string[] {
  const rows: string[] = []
  let current: { text: string; end: number; y: number } | undefined
  for (const piece of page.lines ?? []) {
    if (piece.w === undefined) fail(`FreeCram: la página ${page.page} no trae la anchura de los fragmentos; vuelve a ejecutar npm run extract`)
    // lines llega ordenado por filas (misma fila si la base difiere menos de 2 puntos) y, dentro de la fila, de izquierda a derecha.
    if (current && Math.abs(current.y - piece.y) < 2) {
      current.text += (piece.x - current.end > GLUE_GAP ? ' ' : '') + piece.text
      current.end = piece.x + piece.w
    } else {
      if (current) rows.push(normalizeText(current.text))
      current = { text: piece.text, end: piece.x + piece.w, y: piece.y }
    }
  }
  if (current) rows.push(normalizeText(current.text))
  return rows
}

/**
 * Arreglos mecánicos de la transcripción de FreeCram, sin tocar el sentido: apóstrofos partidos
 * ("manager ' s"), comillas con espacios de más (" Yes "), espacio antes de la puntuación y el sufijo
 * de campo personalizado que pierde un guion bajo (Sun_c → Sun__c). Lo que exige criterio (palabras
 * caídas, mayúsculas al azar) se corrige en la curación.
 */
export function tidy(text: string): string {
  return tightenQuotes(text)
    .replace(/`([^`\n]*)`/g, (_, name: string) => name.trim())
    .replace(/(\w) ' (s|t|re|ll|d|ve|m)\b/g, "$1'$2")
    .replace(/(?<=[A-Za-z0-9])_c\b/g, '__c')
    .replace(/(\w|["')]) +([,.;?!])(?=\s|$)/g, '$1$2')
    .replace(MID_SENTENCE_CAPITAL, (word) => word.toLowerCase())
}

/**
 * Palabras de función que la transcripción deja en mayúscula en mitad de la frase ("version Is active").
 * Solo las que no abren frase en estas preguntas ("Which", "When" o "The" pueden ser un inicio real tras un
 * punto perdido; eso lo decide la curación) y solo si la palabra siguiente va en minúscula, para no tocar
 * nombres propios ni títulos como "Rules Of Engagement".
 */
const MID_SENTENCE_CAPITAL = new RegExp(
  `(?<=[a-z0-9,)] )(?:${['As', 'To', 'From', 'About', 'Are', 'Is', 'Whose', 'Of', 'For', 'On', 'At', 'By', 'Into', 'Than', 'Be'].join('|')})\\b(?= [a-z])`,
  'g',
)

/** Quita los espacios interiores de las comillas dobles, solo si todas van en pares con ese patrón. */
function tightenQuotes(text: string): string {
  const parts = text.split('"')
  if (parts.length % 2 === 0) return text
  for (let i = 1; i < parts.length; i += 2) if (!/^ \S(?:.*\S)? $/.test(parts[i])) return text
  return parts.map((part, i) => (i % 2 ? part.trim() : part)).join('"')
}

/** Parte las líneas en bloques por su cabecera; la numeración debe ser correlativa desde 1. */
function splitBlocks(lines: string[], start: RegExp, source: SourceId): Block[] {
  const blocks: Block[] = []
  for (const line of lines) {
    const match = start.exec(line)
    if (match) {
      const rest = (match[2] ?? '').trim()
      blocks.push({ n: Number(match[1]), lines: rest ? [rest] : [] })
    } else if (blocks.length) blocks.at(-1)!.lines.push(line)
    else if (!COVER.test(line)) fail(`${source}: texto antes de la primera pregunta: "${line}"`)
  }
  if (!blocks.length) fail(`${source}: no hay preguntas`)
  blocks.forEach((block, i) => {
    if (block.n !== i + 1) fail(`${source}: se esperaba la pregunta ${i + 1} y aparece la ${block.n}`)
  })
  return blocks
}

function parseBlock({ n, lines }: Block, { source, prefix, layout, keys = {}, images = {} }: FreecramFormat): ParsedQuestion {
  const ref = layout === 'new' ? `#${n}` : `NO.${n}`
  const where = `${source} ${ref}`
  const answerAt = lines.findIndex((line) => line.startsWith('Answer:'))
  if (answerAt < 0) fail(`${where}: falta "Answer:"`)

  const raw = lines[answerAt].replace(/^Answer:\s*/, '')
  const hidden = raw.includes('(SHOW ANSWER)')
  const visible = raw.replace(/\((SHOW ANSWER|LEAVE A REPLY)\)/g, '').trim()

  // Una línea abre opción solo si empieza por la letra siguiente; si no, continúa la anterior.
  const stemLines: string[] = []
  const optionLines: { key: string; lines: string[] }[] = []
  let expected = 'A'
  for (const line of lines.slice(0, answerAt)) {
    // "A." suelto: la opción es una imagen y su texto llega por `images`. En el documento revisado alguna opción
    // va sin espacio tras la letra ("A.Street__c").
    const option = (layout === 'doc' ? /^([A-F])\.(?:\s*(.*))?$/ : /^([A-F])\.(?:\s+(.*))?$/).exec(line)
    if (option && option[1] === expected) {
      optionLines.push({ key: option[1], lines: [option[2] ?? ''] })
      expected = nextLetter(expected)
    } else if (optionLines.length) optionLines.at(-1)!.lines.push(line)
    else stemLines.push(line)
  }

  const fix = images[String(n)]
  const stem = fix?.stem ?? tidy(cleanStem(joinLines(stemLines)))
  const options: Option[] = optionLines.map(({ key, lines }) => ({
    key,
    text: fix?.options?.[key] ?? tidy(cleanOption(joinLines(lines))),
  }))
  for (const key of Object.keys(fix?.options ?? {})) {
    if (!options.some((o) => o.key === key)) fail(`${where}: la transcripción trae la opción ${key}, que no existe`)
  }
  if (options.length < 3) fail(`${where}: solo ${options.length} opciones`)

  const correct = hidden ? (keys[String(n)] ?? []) : visible.split(/[\s,]+/).filter(Boolean)
  for (const key of correct) {
    if (!options.some((o) => o.key === key)) fail(`${where}: la respuesta ${key} no es una opción`)
  }
  assertClean(stem, where)
  options.forEach((o) => assertClean(o.text, `${where} ${o.key}`))

  // La explicación va después de la clave; en el formato NO.N empieza con su propia etiqueta.
  const explanation = lines.slice(answerAt + 1)
  if (explanation[0]?.startsWith('Explanation:')) explanation[0] = explanation[0].replace(/^Explanation:\s*/, '')
  const sourceExplanation = joinLines(explanation)

  return {
    id: `${prefix}-${String(n).padStart(3, '0')}`,
    source,
    ref,
    stem,
    options,
    correct,
    shuffle: true,
    learnMore: [],
    ...(sourceExplanation ? { sourceExplanation } : {}),
  }
}
