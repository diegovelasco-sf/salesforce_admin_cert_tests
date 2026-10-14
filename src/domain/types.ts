export type SectionKey =
  | 'config'
  | 'objects'
  | 'sales'
  | 'service'
  | 'productivity'
  | 'data'
  | 'automation'
  | 'agentforce'

export type SourceId = 'freecram' | 'crt101' | 'adx201' | 'success4exam' | 'trailhead' | 'debrief'

/** ok: clave de la fuente verificada · corrected: clave cambiada · disputed: dudosa · outdated: obsoleta */
export type ReviewStatus = 'ok' | 'corrected' | 'disputed' | 'outdated'

export interface Option {
  /** Letra de la opción en la fuente original ("A"…"E"). Las respuestas se guardan por esta clave. */
  key: string
  text: string
  /** Se queda al final al barajar ("All of the above"). */
  pinned?: boolean
}

export interface LearnMore {
  title: string
  url?: string
}

/** Pregunta tal como sale de un parser, antes de la curación. */
export interface ParsedQuestion {
  /** Estable, según la numeración de la fuente: fc-034, crt-07, adx-04-3. */
  id: string
  source: SourceId
  /** Referencia legible a la fuente: "NO.34", "Q7", "L4 Q3". */
  ref: string
  stem: string
  options: Option[]
  correct: string[]
  shuffle: boolean
  learnMore: LearnMore[]
  /** Explicación original de la fuente, solo como apoyo para redactar explanationEs. */
  sourceExplanation?: string
  /** La fuente solo traía la pregunta y la respuesta: las demás opciones se han redactado aparte. */
  authoredOptions?: boolean
}

export interface Question {
  id: string
  source: SourceId
  ref: string
  section: SectionKey
  stem: string
  options: Option[]
  correct: string[]
  /** Clave original de la fuente cuando la curación la corrige. */
  sourceCorrect?: string[]
  shuffle: boolean
  review: ReviewStatus
  reviewNote?: string
  explanationEs?: string
  learnMore: LearnMore[]
  authoredOptions?: boolean
}

export interface Bank {
  hash: string
  questions: Question[]
}

export interface TextFix {
  /** "stem" o "option:<clave>". */
  field: string
  from: string
  to: string
}

export interface CurationEntry {
  section?: SectionKey
  /** Motivo por el que la pregunta no entra en el banco. */
  exclude?: string
  duplicateOf?: string
  /** Preguntas parecidas (el build las detecta) que se han revisado y son distintas. */
  distinctFrom?: string[]
  correct?: string[]
  review?: ReviewStatus
  /** Motivo de la revisión. En un duplicado con otra clave que su destino, explica cómo se ha resuelto. */
  reviewNote?: string
  textFixes?: TextFix[]
  explanationEs?: string
  learnMore?: LearnMore[]
}

export type Curation = Record<string, CurationEntry>
