// Banco: buscar y consultar cualquier pregunta con su respuesta, marcarla, anotarla o practicar las encontradas.
import { useDeferredValue, useMemo, useState, type Dispatch } from 'react'
import { canonicalSearch } from '../domain/search.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { inSources, isDoubtful } from '../domain/sampling.ts'
import { inReview } from '../domain/stats.ts'
import type { Progress } from '../domain/storage.ts'
import type { SectionKey, SourceId } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { useI18n } from './lang.ts'
import { sectionText, sourceLabel } from './messages.ts'
import { QuestionCard } from './QuestionCard.tsx'
import { bankSources } from './modes.ts'
import { makeRun, type Action } from './state.ts'

type Status = 'all' | 'flagged' | 'failed' | 'noted' | 'unseen' | 'doubtful'
const PAGE = 25

export function Browse({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const { cert, bank } = useCert()
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<SectionKey | ''>('')
  const [source, setSource] = useState<SourceId | ''>('')
  const [status, setStatus] = useState<Status>('all')
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState<string | undefined>()
  const [editing, setEditing] = useState<string | undefined>()
  const deferred = useDeferredValue(query)

  const index = useMemo(() => new Map(bank.questions.map((q) => [q.id, canonicalSearch(`${q.id} ${q.stem} ${q.options.map((o) => o.text).join(' ')}`)])), [bank])
  const terms = canonicalSearch(deferred).split(' ').filter(Boolean)
  const matches = bank.questions.filter((q) => {
    if (section && q.section !== section) return false
    if (source && !inSources(q, [source])) return false
    const stat = progress.stats[q.id]
    const flagged = progress.flagged.includes(q.id)
    if (status === 'flagged' && !flagged) return false
    if (status === 'failed' && !inReview(stat, flagged)) return false
    if (status === 'noted' && !progress.notes[q.id]) return false
    if (status === 'unseen' && stat) return false
    if (status === 'doubtful' && !isDoubtful(q)) return false
    const text = index.get(q.id)!
    return terms.every((term) => text.includes(term))
  })
  const statuses: [Status, string][] = [
    ['all', t.browse.statusAll],
    ['flagged', t.browse.statusFlagged],
    ['failed', t.browse.statusFailed],
    ['noted', t.browse.statusNoted],
    ['unseen', t.browse.statusUnseen],
    ['doubtful', t.browse.statusDoubtful],
  ]
  const reset = () => setShown(PAGE)

  const practice = () => {
    const rng = mulberry32(randomSeed())
    dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('practice', matches, rng) } })
  }

  return (
    <div className="browse">
      <h1>{t.browse.title}</h1>
      <p className="muted">{t.browse.intro}</p>

      <section className="card browse-filters">
        <label className="field field-wide">
          <span>{t.browse.search}</span>
          <input
            type="search"
            value={query}
            placeholder={t.browse.searchPlaceholder}
            onChange={(e) => {
              setQuery(e.target.value)
              reset()
            }}
          />
        </label>
        <label className="field">
          <span>{t.browse.section}</span>
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value as SectionKey | '')
              reset()
            }}
          >
            <option value="">{t.browse.allSections}</option>
            {cert.sections.map((s) => (
              <option key={s.key} value={s.key}>
                {sectionText(s, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t.browse.source}</span>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as SourceId | '')
              reset()
            }}
          >
            <option value="">{t.browse.allSources}</option>
            {bankSources(bank.questions).map((s) => (
              <option key={s} value={s}>
                {sourceLabel(s, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t.browse.status}</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status)
              reset()
            }}
          >
            {statuses.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="browse-bar">
        <span className="muted" aria-live="polite">
          {t.browse.results(matches.length, bank.questions.length)}
        </span>
        <button type="button" disabled={!matches.length} onClick={practice}>
          {t.browse.practiceThese(matches.length)}
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="card muted">{t.browse.empty}</p>
      ) : (
        <ol className="result-list">
          {matches.slice(0, shown).map((q) => {
            const expanded = open === q.id
            const stat = progress.stats[q.id]
            const flagged = progress.flagged.includes(q.id)
            return (
              <li key={q.id} className="result-item">
                <button type="button" className="result-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : q.id)}>
                  <span className="result-verdict muted">
                    {flagged && '★ '}
                    {progress.notes[q.id] && '✎ '}
                    {t.browse.seenStat(stat?.seen ?? 0, stat?.correct ?? 0)}
                  </span>
                  <span className="result-stem">{q.stem}</span>
                  <span className="result-chevron" aria-hidden="true">
                    {expanded ? '▴' : '▾'}
                  </span>
                </button>
                {expanded && (
                  <QuestionCard
                    question={q}
                    order={q.options.map((o) => o.key)}
                    selected={[]}
                    revealed
                    flagged={flagged}
                    onToggleFlag={() => dispatch({ type: 'flag/toggle', id: q.id })}
                    note={progress.notes[q.id]}
                    onNote={(text) => dispatch({ type: 'note/set', id: q.id, text })}
                    editingNote={editing === q.id}
                    onEditingNote={(o) => setEditing(o ? q.id : undefined)}
                  />
                )}
              </li>
            )
          })}
        </ol>
      )}
      {matches.length > shown && (
        <div className="actions">
          <button type="button" onClick={() => setShown(shown + PAGE)}>
            {t.browse.showMore(Math.min(PAGE, matches.length - shown))}
          </button>
        </div>
      )}
    </div>
  )
}
