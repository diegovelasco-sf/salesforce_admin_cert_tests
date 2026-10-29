// Construye el banco: fusiona data/parsed (preguntas de las fuentes) con data/curation (sección,
// revisión, explicación…) y valida el resultado. Lo usan scripts/build-bank.ts y su test.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { CERTS, type CertConfig } from '../src/domain/certs.ts'
import { apportion, filterPool } from '../src/domain/sampling.ts'
import type { Bank, CertId, Curation, CurationEntry, ParsedQuestion, Question, TextFix } from '../src/domain/types.ts'
import { assertClean, canonical } from './parse/normalize.ts'
import { SOURCES, curationPath, parsedPath, readJson } from './paths.ts'

export interface BuildResult {
  bank: Bank
  errors: string[]
  report: string[]
}

/** "Which two…", "What are three…", "Choose two…": cuántas correctas promete el enunciado. */
export const COUNT_WORDING = /\b(?:which|what are|choose|select)\s+(two|three)\b/i
export const ARTIFACTS: [RegExp, string][] = [
  [/\?\d+$/m, 'número pegado tras la interrogación'],
  [/[a-z]\d+[a-z]/, 'dígito dentro de una palabra'],
  [/[a-z]\d{1,2}$/, 'dígito pegado al final'],
  [/I apologize|IT Certification Guaranteed|FREECRAM/i, 'texto ajeno a la pregunta'],
]
/** Las opciones se barajan, así que las explicaciones no pueden nombrarlas por letra ni posición. */
export const LETTER_REFERENCES: RegExp[] = [
  /\b(?:options?|opci[oó]n(?:es)?)\s+[A-E]\b/i,
  /\([A-E]\)/,
  /\b(?:respuestas?|la|las|letra)\s+[A-E](?:\s*(?:,|y|e|and)\s*[A-E])*(?=[\s.,;:)]|$)/,
  /\b(?:primera|segunda|tercera|cuarta|quinta|[uú]ltima|first|second|third|fourth|last)\s+(?:opci[oó]n|option)/i,
]
/** Lo mismo para la explicación en inglés. */
export const EN_LETTER_REFERENCES: RegExp[] = [
  /\b(?:options?|answers?|choices?)\s+[A-E]\b/i,
  /\([A-E]\)/,
  /\b(?:first|second|third|fourth|fifth|last)\s+(?:option|answer|choice)\b/i,
]
export const NEAR_DUPLICATE = 0.8
/** Parecido mínimo entre una respuesta de un duplicado y la opción equivalente de su destino. */
export const SAME_ANSWER = 0.5

/** Banco de una certificación que aún no tiene curación: la app lo muestra como «en preparación». */
export const PENDING_BANK: Bank = { hash: 'en-preparacion', questions: [] }

/** Una certificación está pendiente mientras ninguna de sus fuentes tenga curación; en cuanto una la tiene, se valida entera. */
export const isPending = (cert: CertId): boolean =>
  SOURCES.filter((source) => source.cert === cert).every((source) => !existsSync(curationPath(source.id)))

export function buildBank({ cert = 'admin', strict = false }: { cert?: CertId; strict?: boolean } = {}): BuildResult {
  const config = CERTS[cert]
  const sources = SOURCES.filter((source) => source.cert === cert)
  if (isPending(cert)) {
    return { bank: PENDING_BANK, errors: [], report: [`Banco ${config.name}: en preparación (sin curación todavía), ${sources.length} fuentes por curar`] }
  }
  const errors: string[] = []
  const parsed = new Map<string, ParsedQuestion>()
  const curation = new Map<string, CurationEntry>()

  for (const source of sources) {
    const questions = readJson<ParsedQuestion[]>(parsedPath(source.id))
    const entries = existsSync(curationPath(source.id)) ? readJson<Curation>(curationPath(source.id)) : {}
    questions.forEach((q) => parsed.set(q.id, q))
    for (const [id, entry] of Object.entries(entries)) {
      if (!questions.some((q) => q.id === id)) errors.push(`${id}: entrada de curación sin pregunta en ${source.id}`)
      curation.set(id, entry)
    }
  }

  const questions = assemble(parsed, curation, config, strict, errors)
  const hash = createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 12)
  return { bank: { hash, questions }, errors, report: report(questions, config, sources.map((s) => s.id)) }
}

/** Fusiona preguntas y curación y aplica todas las validaciones; separado de la lectura de ficheros para poder probar un lote suelto. */
export function assemble(
  parsed: Map<string, ParsedQuestion>,
  curation: Map<string, CurationEntry>,
  config: CertConfig,
  strict: boolean,
  errors: string[],
): Question[] {
  const questions: Question[] = []
  const duplicates: [ParsedQuestion, CurationEntry][] = []
  for (const p of parsed.values()) {
    const entry = curation.get(p.id) ?? {}
    if (entry.exclude) continue
    if (entry.duplicateOf) {
      duplicates.push([p, entry])
      continue
    }
    const question = merge(p, entry, config, errors)
    if (question) {
      validate(question, entry, strict, errors)
      questions.push(question)
    }
  }
  // Los duplicados se comparan con su destino ya curado: textos corregidos y clave revisada.
  const included = new Map(questions.map((q) => [q.id, q]))
  for (const [p, entry] of duplicates) checkDuplicate(p, entry, included, errors)
  checkNearDuplicates(questions, curation, errors)
  return questions
}

function merge(p: ParsedQuestion, entry: CurationEntry, config: CertConfig, errors: string[]): Question | undefined {
  if (!entry.section || !config.sections.some((s) => s.key === entry.section)) {
    errors.push(`${p.id}: sección ${entry.section ? `desconocida "${entry.section}"` : 'sin asignar'}`)
    return undefined
  }
  const question: Question = {
    id: p.id,
    source: p.source,
    ref: p.ref,
    section: entry.section,
    stem: p.stem,
    options: p.options.map((o) => ({ ...o })),
    correct: entry.correct ?? p.correct,
    ...(entry.correct ? { sourceCorrect: p.correct } : {}),
    shuffle: p.shuffle,
    review: entry.review ?? 'ok',
    ...(entry.reviewNote ? { reviewNote: entry.reviewNote } : {}),
    ...(entry.explanationEs ? { explanationEs: entry.explanationEs } : {}),
    ...(entry.explanationEn ? { explanationEn: entry.explanationEn } : {}),
    learnMore: [...p.learnMore, ...(entry.learnMore ?? [])],
    ...(p.authoredOptions ? { authoredOptions: true } : {}),
  }
  for (const fix of entry.textFixes ?? []) applyFix(question, fix, errors)
  return question
}

/** Cada corrección de texto debe encontrar su texto exactamente una vez. */
function applyFix(question: Question, fix: TextFix, errors: string[]): void {
  const where = `${question.id} textFix "${fix.from}"`
  const option = fix.field.startsWith('option:') ? question.options.find((o) => o.key === fix.field.slice(7)) : undefined
  const text = fix.field === 'stem' ? question.stem : option?.text
  if (text === undefined) return void errors.push(`${where}: campo desconocido "${fix.field}"`)
  const hits = text.split(fix.from).length - 1
  if (hits !== 1) return void errors.push(`${where}: aparece ${hits} veces en ${fix.field}`)
  const fixed = text.replace(fix.from, fix.to)
  if (option) option.text = fixed
  else question.stem = fixed
}

function validate(q: Question, entry: CurationEntry, strict: boolean, errors: string[]): void {
  const fail = (message: string) => errors.push(`${q.id}: ${message}`)
  const keys = q.options.map((o) => o.key)

  if (new Set(keys).size !== keys.length) fail('claves de opción repetidas')
  if (!q.correct.length) fail('sin respuesta correcta')
  if (new Set(q.correct).size !== q.correct.length) fail('respuesta correcta repetida')
  for (const key of q.correct) if (!keys.includes(key)) fail(`la respuesta ${key} no es una opción`)
  if (q.correct.length >= q.options.length) fail('todas las opciones son correctas')

  const wording = COUNT_WORDING.exec(q.stem)
  if (wording) {
    const expected = wording[1].toLowerCase() === 'two' ? 2 : 3
    if (q.correct.length !== expected) fail(`el enunciado pide ${expected} respuestas y la clave tiene ${q.correct.length}`)
  }

  for (const [field, text] of [['enunciado', q.stem], ...q.options.map((o) => [`opción ${o.key}`, o.text])]) {
    for (const [pattern, label] of ARTIFACTS) if (pattern.test(text)) fail(`${label} en ${field}: "${text.slice(0, 80)}"`)
    try {
      assertClean(text, field)
    } catch (error) {
      fail((error as Error).message)
    }
  }

  if (entry.correct && q.review !== 'corrected') fail('corrige la clave pero no está marcada como "corrected"')
  if (q.review === 'corrected' && (!entry.correct || entry.correct.join() === q.sourceCorrect?.join())) {
    fail('"corrected" exige una clave distinta de la de la fuente')
  }
  if (q.review !== 'ok' && !q.reviewNote) fail(`"${q.review}" exige reviewNote`)

  if (q.explanationEs !== undefined) {
    if (!q.explanationEs.trim()) fail('explicación vacía')
    for (const pattern of LETTER_REFERENCES) {
      const match = pattern.exec(q.explanationEs)
      if (match) fail(`la explicación nombra una opción por su letra o posición: "${match[0]}"`)
    }
    for (const pattern of [ARTIFACTS[3][0]]) if (pattern.test(q.explanationEs)) fail('texto ajeno en la explicación')
  }
  if (q.explanationEn !== undefined) {
    if (!q.explanationEn.trim()) fail('explanationEn vacía')
    for (const pattern of EN_LETTER_REFERENCES) {
      const match = pattern.exec(q.explanationEn)
      if (match) fail(`explanationEn nombra una opción por su letra o posición: "${match[0]}"`)
    }
    if (ARTIFACTS[3][0].test(q.explanationEn)) fail('texto ajeno en explanationEn')
  }
  if (strict) {
    if (!q.explanationEs) fail('falta explanationEs')
    if (!entry.review) fail('falta review explícito')
  }

  for (const link of q.learnMore) {
    if (!link.url) continue
    try {
      const url = new URL(link.url)
      const host = url.hostname
      if (url.protocol !== 'https:' || !(host === 'salesforce.com' || host.endsWith('.salesforce.com'))) {
        fail(`enlace fuera de salesforce.com por https: ${link.url}`)
      }
    } catch {
      fail(`enlace no válido: ${link.url}`)
    }
  }
}

/**
 * Un duplicado declarado debe apuntar a una pregunta del banco y dar su misma respuesta. Cada fuente
 * redacta las opciones a su manera, así que cada respuesta del duplicado se empareja con la opción más
 * parecida del destino. Si no salen justo sus correctas, solo se acepta con el destino marcado como
 * "corrected" o "disputed" y un reviewNote en el duplicado que explique la diferencia.
 */
function checkDuplicate(p: ParsedQuestion, entry: CurationEntry, included: Map<string, Question>, errors: string[]): void {
  const fail = (message: string): void => void errors.push(`${p.id}: ${message}`)
  const target = included.get(entry.duplicateOf!)
  if (!target) return fail(`duplicateOf apunta a ${entry.duplicateOf}, que no está en el banco`)

  const matched = new Set<string>()
  for (const answer of p.options.filter((o) => p.correct.includes(o.key))) {
    const answerWords = words(answer.text)
    const [best] = target.options
      .map((o) => ({ key: o.key, score: jaccard(answerWords, words(o.text)) }))
      .sort((a, b) => b.score - a.score)
    if (best.score < SAME_ANSWER) return fail(`la respuesta "${answer.text}" no se parece a ninguna opción de ${target.id}`)
    matched.add(best.key)
  }
  const agrees = matched.size === target.correct.length && target.correct.every((key) => matched.has(key))
  if (agrees) return
  if (!entry.reviewNote || (target.review !== 'corrected' && target.review !== 'disputed')) {
    fail(`es duplicado de ${target.id} pero sus respuestas no coinciden: marca el destino como "corrected" o "disputed" y explica la diferencia en reviewNote`)
  }
}

export const words = (text: string): Set<string> => new Set(canonical(text).split(' '))
const tokens = (q: Question): Set<string> => words(`${q.stem} ${q.options.map((o) => o.text).sort().join(' ')}`)

export function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0
  for (const token of a) if (b.has(token)) shared++
  return shared / (a.size + b.size - shared)
}

/** Detecta preguntas casi iguales que no se han declarado como duplicadas ni como distintas. */
function checkNearDuplicates(questions: Question[], curation: Map<string, CurationEntry>, errors: string[]): void {
  const sets = questions.map(tokens)
  const acknowledged = (a: string, b: string) =>
    curation.get(a)?.distinctFrom?.includes(b) || curation.get(b)?.distinctFrom?.includes(a)
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const similarity = jaccard(sets[i], sets[j])
      if (similarity >= NEAR_DUPLICATE && !acknowledged(questions[i].id, questions[j].id)) {
        errors.push(
          `${questions[i].id} y ${questions[j].id} se parecen (${similarity.toFixed(2)}): declara duplicateOf o distinctFrom`,
        )
      }
    }
  }
}

function report(questions: Question[], config: CertConfig, sourceIds: string[]): string[] {
  const count = (pred: (q: Question) => boolean) => questions.filter(pred).length
  const pool = filterPool(questions, config, { excludeDoubtful: true, officialOnly: false })
  const quota = apportion(config.exam.questionCount, config.sections.map((s) => s.weight))
  const lines = [
    `Banco ${config.name}: ${questions.length} preguntas · ` +
      sourceIds.map((id) => `${id} ${count((q) => q.source === id)}`).join(' · '),
    `Revisión: ` + (['ok', 'corrected', 'disputed', 'outdated'] as const).map((r) => `${r} ${count((q) => q.review === r)}`).join(' · '),
    `Varias respuestas: ${count((q) => q.correct.length > 1)} · Con explicación: ${count((q) => !!q.explanationEs)}/${questions.length}`,
    `Cobertura para el simulacro (sin dudosas ni obsoletas), disponibles / necesarias:`,
  ]
  config.sections.forEach((s, i) => {
    const available = pool.filter((q) => q.section === s.key).length
    lines.push(`  ${available >= quota[i] ? ' ' : '!'} ${s.label}: ${available} / ${quota[i]}`)
  })
  return lines
}
