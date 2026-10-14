import { OFFICIAL_SOURCES, SOURCE_LABELS, sectionLabel } from '../domain/exam.ts'
import { toggleSelection } from '../domain/selection.ts'
import { displayLetter } from '../domain/shuffle.ts'
import type { Question, ReviewStatus } from '../domain/types.ts'

interface Props {
  question: Question
  /** Claves de las opciones en el orden en que se muestran. */
  order: string[]
  selected: string[]
  /** Sin onSelect la pregunta es de solo lectura. */
  onSelect?: (keys: string[]) => void
  /** Muestra qué opciones eran correctas y la explicación. */
  revealed: boolean
  position?: { index: number; total: number }
  flagged?: boolean
  onToggleFlag?: () => void
  /** "revisar" en el simulacro (como en el examen real), "repasar" en la práctica. */
  flagPurpose?: 'revisar' | 'repasar'
}

const REVIEW_LABELS: Record<Exclude<ReviewStatus, 'ok'>, string> = {
  corrected: 'Clave corregida',
  disputed: 'Respuesta dudosa',
  outdated: 'Pregunta desactualizada',
}

type OptionState = 'idle' | 'selected' | 'right' | 'missed' | 'wrong' | 'neutral'

const VERDICTS: Partial<Record<OptionState, string>> = {
  right: '✓ Correcta',
  missed: '✓ Correcta, no la marcaste',
  wrong: '✗ Tu respuesta',
}

export function QuestionCard({ question, order, selected, onSelect, revealed, position, flagged, onToggleFlag, flagPurpose = 'repasar' }: Props) {
  const max = question.correct.length
  const multi = max > 1
  const interactive = !!onSelect && !revealed
  const official = OFFICIAL_SOURCES.includes(question.source)
  const byKey = new Map(question.options.map((o) => [o.key, o]))
  const toggle = (key: string) => {
    if (interactive && onSelect) onSelect(toggleSelection(selected, key, max))
  }

  return (
    <article className="card question" aria-labelledby={`stem-${question.id}`}>
      <header className="question-meta">
        {position && (
          <span className="question-number">
            Pregunta {position.index + 1} de {position.total}
          </span>
        )}
        <span className="badge">{sectionLabel(question.section)}</span>
        <span className={`badge ${official ? 'badge-official' : 'badge-unofficial'}`}>
          {SOURCE_LABELS[question.source]} · {question.ref}
        </span>
        {onToggleFlag && (
          <button type="button" className={`flag-button${flagged ? ' on' : ''}`} aria-pressed={flagged} onClick={onToggleFlag}>
            {flagged ? `★ Marcada para ${flagPurpose}` : `☆ Marcar para ${flagPurpose}`}
          </button>
        )}
      </header>

      <p className="stem" id={`stem-${question.id}`}>
        {question.stem}
      </p>
      {multi && (
        <p className="choose" id={`choose-${question.id}`}>
          Elige {max} · {selected.length} de {max} marcadas
        </p>
      )}

      <fieldset className="options">
        <legend className="sr-only">Opciones</legend>
        {order.map((key, i) => {
          const option = byKey.get(key)
          if (!option) return null
          const isSelected = selected.includes(key)
          const isAnswer = question.correct.includes(key)
          const state: OptionState = revealed
            ? isAnswer
              ? isSelected
                ? 'right'
                : 'missed'
              : isSelected
                ? 'wrong'
                : 'neutral'
            : isSelected
              ? 'selected'
              : 'idle'
          const blocked = interactive && multi && !isSelected && selected.length >= max
          return (
            <label key={key} className={`option option-${state}${blocked ? ' option-blocked' : ''}`}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={`q-${question.id}`}
                checked={isSelected}
                disabled={!interactive || blocked}
                aria-describedby={multi ? `choose-${question.id}` : undefined}
                onChange={() => toggle(key)}
              />
              <span className="option-letter" aria-hidden="true">
                {displayLetter(i)}
              </span>
              <span className="option-text">{option.text}</span>
              {VERDICTS[state] && <span className="option-verdict">{VERDICTS[state]}</span>}
            </label>
          )
        })}
      </fieldset>

      {revealed && <Explanation question={question} />}
    </article>
  )
}

function Explanation({ question }: { question: Question }) {
  const sourceAnswer = question.sourceCorrect
    ?.map((key) => question.options.find((o) => o.key === key)?.text)
    .filter(Boolean)
    .join(' / ')
  return (
    <section className="explanation" aria-label="Explicación">
      {question.review !== 'ok' && (
        <p className={`review-note review-${question.review}`}>
          <strong>⚠ {REVIEW_LABELS[question.review]}.</strong> {question.reviewNote}
          {sourceAnswer && <span className="source-answer"> La fuente daba como correcta: «{sourceAnswer}».</span>}
        </p>
      )}
      {question.authoredOptions && (
        <p className="authored-note muted">
          La fuente solo traía la pregunta y su respuesta: las opciones incorrectas se han redactado aparte para poder practicarla.
        </p>
      )}
      {question.explanationEs ? (
        <p className="explanation-text">{question.explanationEs}</p>
      ) : (
        <p className="muted">Explicación pendiente: todavía no está redactada para esta pregunta.</p>
      )}
      {question.learnMore.length > 0 && (
        <div className="learn-more">
          <span className="learn-more-title">Para saber más</span>
          <ul>
            {question.learnMore.map((link) => (
              <li key={link.title + (link.url ?? '')}>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.title}
                  </a>
                ) : (
                  link.title
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
