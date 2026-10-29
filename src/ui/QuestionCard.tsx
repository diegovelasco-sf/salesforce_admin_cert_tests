import { toggleSelection } from '../domain/selection.ts'
import { displayLetter } from '../domain/shuffle.ts'
import type { Question } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { useI18n } from './lang.ts'
import { sectionName, sourceLabel } from './messages.ts'

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
  /** Qué hace la marca: se revisa en el simulacro (como en el examen real) y se repasa en la práctica. */
  flagContext?: 'exam' | 'practice'
}

type OptionState = 'idle' | 'selected' | 'right' | 'missed' | 'wrong' | 'neutral'

export function QuestionCard({ question, order, selected, onSelect, revealed, position, flagged, onToggleFlag, flagContext = 'practice' }: Props) {
  const { cert } = useCert()
  const { t, lang } = useI18n()
  const verdicts: Partial<Record<OptionState, string>> = {
    right: t.card.verdictRight,
    missed: t.card.verdictMissed,
    wrong: t.card.verdictWrong,
  }
  const max = question.correct.length
  const multi = max > 1
  const interactive = !!onSelect && !revealed
  const official = cert.officialSources.includes(question.source)
  const byKey = new Map(question.options.map((o) => [o.key, o]))
  const toggle = (key: string) => {
    if (interactive && onSelect) onSelect(toggleSelection(selected, key, max))
  }

  return (
    <article className="card question" aria-labelledby={`stem-${question.id}`}>
      <header className="question-meta">
        {position && (
          <span className="question-number">
            {t.card.number(position.index + 1, position.total)}
          </span>
        )}
        <span className="badge">{sectionName(cert, question.section, lang)}</span>
        <span className={`badge ${official ? 'badge-official' : 'badge-unofficial'}`}>
          {sourceLabel(question.source, lang)} · {question.ref}
        </span>
        {onToggleFlag && (
          <button type="button" className={`flag-button${flagged ? ' on' : ''}`} aria-pressed={flagged} onClick={onToggleFlag}>
            {flagged ? t.card.flagOn(flagContext) : t.card.flagOff(flagContext)}
          </button>
        )}
      </header>

      <p className="stem" id={`stem-${question.id}`}>
        {question.stem}
      </p>
      {multi && (
        <p className="choose" id={`choose-${question.id}`}>
          {t.card.chooseN(max, selected.length)}
        </p>
      )}

      <fieldset className="options">
        <legend className="sr-only">{t.card.options}</legend>
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
              {verdicts[state] && <span className="option-verdict">{verdicts[state]}</span>}
            </label>
          )
        })}
      </fieldset>

      {revealed && <Explanation question={question} />}
    </article>
  )
}

function Explanation({ question }: { question: Question }) {
  const { t, lang } = useI18n()
  const explanation = lang === 'en' ? question.explanationEn : question.explanationEs
  const sourceAnswer = question.sourceCorrect
    ?.map((key) => question.options.find((o) => o.key === key)?.text)
    .filter(Boolean)
    .join(' / ')
  return (
    <section className="explanation" aria-label={t.card.explanation}>
      {question.review !== 'ok' && (
        <p className={`review-note review-${question.review}`}>
          <strong>⚠ {t.card.review[question.review]}.</strong> {question.reviewNote}
          {sourceAnswer && <span className="source-answer">{t.card.sourceGave(sourceAnswer)}</span>}
        </p>
      )}
      {question.authoredOptions && (
        <p className="authored-note muted">{t.card.authored}</p>
      )}
      {explanation ? <p className="explanation-text">{explanation}</p> : <p className="muted">{t.card.pending}</p>}
      {question.learnMore.length > 0 && (
        <div className="learn-more">
          <span className="learn-more-title">{t.card.learnMore}</span>
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
