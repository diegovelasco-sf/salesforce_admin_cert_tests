// Elección de fuentes de un modo: una casilla por fuente del banco, con cuántas preguntas trae cada una.
// Una pregunta repetida en varias fuentes cuenta en todas (está unificada en el banco).
import { inSources } from '../domain/sampling.ts'
import type { Question, SourceId } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { useI18n } from './lang.ts'
import { sourceLabel } from './messages.ts'
import { bankSources, normalizeSources } from './modes.ts'

interface Props {
  /** Fuentes elegidas; undefined son todas. */
  value: readonly SourceId[] | undefined
  onChange: (sources: SourceId[] | undefined) => void
  /** Preguntas sobre las que se cuenta cada fuente (ya filtradas por lo demás). */
  questions: readonly Question[]
  name: string
}

export function SourcePicker({ value, onChange, questions, name }: Props) {
  const { cert, bank } = useCert()
  const { t, lang } = useI18n()
  const all = bankSources(bank.questions)
  const chosen = value ?? all
  const official = all.filter((s) => cert.officialSources.includes(s))
  const toggle = (source: SourceId) =>
    onChange(normalizeSources(chosen.includes(source) ? chosen.filter((s) => s !== source) : [...chosen, source], all))
  const total = questions.filter((q) => inSources(q, chosen)).length

  return (
    <div className="source-picker" role="group" aria-label={name}>
      <div className="checks">
        {all.map((source) => (
          <label key={source} className="check">
            <input type="checkbox" checked={chosen.includes(source)} onChange={() => toggle(source)} />
            {sourceLabel(source, lang)} <span className="muted">({questions.filter((q) => inSources(q, [source])).length})</span>
          </label>
        ))}
      </div>
      <div className="inline-actions">
        <button type="button" className="link-button" onClick={() => onChange(undefined)}>
          {t.all}
        </button>
        {official.length > 0 && official.length < all.length && (
          <button type="button" className="link-button" onClick={() => onChange(official)}>
            {t.sources.officialOnly}
          </button>
        )}
        <button type="button" className="link-button" onClick={() => onChange([])}>
          {t.none}
        </button>
        <span className="muted">{t.sources.total(total)}</span>
      </div>
    </div>
  )
}
