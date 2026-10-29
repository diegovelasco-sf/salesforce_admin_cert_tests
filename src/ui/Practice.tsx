// Práctica y repaso: configuración de la tanda, preguntas con corrección inmediata y resumen final.
import { useState, type Dispatch } from 'react'
import { isCorrect } from '../domain/grading.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { filterPool, samplePractice } from '../domain/sampling.ts'
import { toggleSelection } from '../domain/selection.ts'
import type { Progress } from '../domain/storage.ts'
import type { SectionKey } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { Stat } from './common.tsx'
import { percent } from './format.ts'
import { useI18n } from './lang.ts'
import { certTexts, sectionText } from './messages.ts'
import { QuestionCard } from './QuestionCard.tsx'
import { makeRun, type Action, type PracticeRun } from './state.ts'
import { useShortcuts } from './useShortcuts.ts'

const COUNTS = [10, 20, 40, 60, 0] as const

export function PracticeSetup({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const { cert, bank } = useCert()
  const { t, lang } = useI18n()
  const hasOfficial = cert.officialSources.length > 0
  const [sections, setSections] = useState<SectionKey[]>(cert.sections.map((s) => s.key))
  const [officialOnly, setOfficialOnly] = useState(hasOfficial && progress.settings.officialOnly)
  const [unseenOnly, setUnseenOnly] = useState(false)
  const [count, setCount] = useState<number>(20)
  const [exact, setExact] = useState(false)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)

  const base = filterPool(bank.questions, cert, { excludeDoubtful: false, officialOnly }).filter(
    (q) => !unseenOnly || !progress.stats[q.id],
  )
  const pool = base.filter((q) => sections.includes(q.section))
  const size = count === 0 ? pool.length : Math.min(count, pool.length)
  // Número exacto: de 1 al tamaño del filtro. Al entrar en el campo adopta el número que ya está en uso.
  const exactMax = Math.max(pool.length, 1)
  const clampExact = (n: number) => Math.min(Math.max(n, 1), exactMax)
  const stepTo = (n: number) => {
    const next = clampExact(n)
    setExact(true)
    setCount(next)
    setDraft(String(next))
  }

  const toggleSection = (key: SectionKey) =>
    setSections((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))

  const start = () => {
    const rng = mulberry32(randomSeed())
    const questions = samplePractice(pool, size, rng)
    dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('practice', questions, rng) } })
  }

  return (
    <section className="card setup">
      <h1>{t.practice.title}</h1>
      <p className="muted">{t.practice.intro}</p>

      <fieldset>
        <legend>{t.practice.sections}</legend>
        <div className="checks">
          {cert.sections.map((s) => (
            <label key={s.key} className="check">
              <input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggleSection(s.key)} />
              {sectionText(s, lang)} <span className="muted">({base.filter((q) => q.section === s.key).length})</span>
            </label>
          ))}
        </div>
        <div className="inline-actions">
          <button type="button" className="link-button" onClick={() => setSections(cert.sections.map((s) => s.key))}>
            {t.all}
          </button>
          <button type="button" className="link-button" onClick={() => setSections([])}>
            {t.none}
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t.practice.sources}</legend>
        {hasOfficial && (
          <>
            <label className="check">
              <input type="radio" name="sources" checked={!officialOnly} onChange={() => setOfficialOnly(false)} />
              {t.all}
            </label>
            <label className="check">
              <input type="radio" name="sources" checked={officialOnly} onChange={() => setOfficialOnly(true)} />
              {t.practice.officialOnly(
                bank.questions.filter((q) => cert.officialSources.includes(q.source)).length,
                certTexts(cert, lang).officialNames,
              )}
            </label>
          </>
        )}
        <label className="check">
          <input type="checkbox" checked={unseenOnly} onChange={() => setUnseenOnly(!unseenOnly)} />
          {t.practice.unseenOnly}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t.practice.count}</legend>
        <div className="segmented">
          {COUNTS.map((n) => (
            <label key={n} className={`segment${!exact && count === n ? ' on' : ''}`}>
              <input
                type="radio"
                name="count"
                checked={!exact && count === n}
                onChange={() => {
                  setExact(false)
                  setCount(n)
                }}
              />
              {n === 0 ? t.all : n}
            </label>
          ))}
        </div>
        <div className="stepper-row">
          <div className="stepper">
            <button type="button" disabled={size <= 1} aria-label={t.practice.fewer} onClick={() => stepTo(size - 1)}>
              −
            </button>
            <input
              type="number"
              className="count-input"
              min={1}
              max={exactMax}
              aria-label={t.practice.exactCount}
              value={focused ? draft : String(size)}
              onFocus={() => {
                setFocused(true)
                stepTo(size)
              }}
              onChange={(e) => {
                setDraft(e.target.value)
                const n = Number.parseInt(e.target.value, 10)
                if (!Number.isNaN(n)) setCount(clampExact(n))
              }}
              onBlur={() => setFocused(false)}
            />
            <button type="button" disabled={size >= exactMax} aria-label={t.practice.more} onClick={() => stepTo(size + 1)}>
              +
            </button>
          </div>
          <span className="muted">{t.practice.exactRange(exactMax)}</span>
        </div>
      </fieldset>

      <div className="actions">
        <button type="button" onClick={() => dispatch({ type: 'navigate', screen: { name: 'home' } })}>
          {t.cancel}
        </button>
        <button type="button" className="primary" disabled={size === 0} onClick={start}>
          {size === 0 ? t.practice.noneFound : t.practice.start(size)}
        </button>
      </div>
    </section>
  )
}

export function PracticeRunner({ run, progress, dispatch }: { run: PracticeRun; progress: Progress; dispatch: Dispatch<Action> }) {
  const { question } = useCert()
  const { t } = useI18n()
  const [summary, setSummary] = useState(false)
  const total = run.questionIds.length
  const id = run.questionIds[run.index]
  const current = question(id)
  const order = run.optionOrder[id]
  const selected = run.selected[id] ?? []
  const checked = run.checked.includes(id)
  const ready = selected.length === current.correct.length
  const last = run.index === total - 1
  const correctIds = run.checked.filter((qid) => isCorrect(question(qid), run.selected[qid]))
  const ok = checked && isCorrect(current, selected)
  const title = t.runTitle[run.kind]

  const go = (index: number) => dispatch({ type: 'practice/goto', index })
  const check = () => ready && !checked && dispatch({ type: 'practice/check', id, now: Date.now() })
  const advance = () => (last ? setSummary(true) : go(run.index + 1))
  const select = (keys: string[]) => dispatch({ type: 'practice/select', id, keys })

  useShortcuts(
    {
      option: (i) => !checked && order[i] && select(toggleSelection(selected, order[i], current.correct.length)),
      enter: () => (checked ? advance() : check()),
      flag: () => dispatch({ type: 'flag/toggle', id }),
      prev: () => go(run.index - 1),
      next: () => checked && advance(),
    },
    !summary,
  )

  if (summary) {
    const failed = run.checked.filter((qid) => !correctIds.includes(qid))
    return (
      <section className="card summary">
        <h1>{t.practice.summary(title)}</h1>
        <div className="kpis">
          <Stat label={t.practice.hit} value={t.pct(percent(correctIds.length, run.checked.length))} />
          <Stat label={t.practice.hits} value={t.ofN(correctIds.length, run.checked.length)} />
          <Stat label={t.practice.unanswered} value={total - run.checked.length} />
        </div>
        <div className="actions">
          <button type="button" onClick={() => dispatch({ type: 'navigate', screen: { name: 'home' } })}>
            {t.backHome}
          </button>
          {failed.length > 0 && (
            <button
              type="button"
              className="primary"
              onClick={() => {
                const rng = mulberry32(randomSeed())
                dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('failed', failed.map(question), rng) } })
                setSummary(false)
              }}
            >
              {t.practice.repeatFailed(failed.length)}
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="runner">
      <div className="run-header">
        <h1>{title}</h1>
        <span className="muted">{t.practice.progress(run.checked.length, total, correctIds.length)}</span>
        <button type="button" className="link-button" onClick={() => setSummary(true)}>
          {t.practice.finish}
        </button>
      </div>

      <QuestionCard
        question={current}
        order={order}
        selected={selected}
        onSelect={select}
        revealed={checked}
        position={{ index: run.index, total }}
        flagged={progress.flagged.includes(id)}
        onToggleFlag={() => dispatch({ type: 'flag/toggle', id })}
      />

      <p className="sr-only" aria-live="polite">
        {checked ? (ok ? t.practice.srRight : t.practice.srWrong) : ''}
      </p>
      {checked && <p className={`verdict ${ok ? 'status-good' : 'status-bad'}`}>{ok ? t.practice.right : t.practice.wrong}</p>}

      <div className="actions">
        <button type="button" disabled={run.index === 0} onClick={() => go(run.index - 1)}>
          {t.previous}
        </button>
        {!checked ? (
          <button type="button" className="primary" disabled={!ready} onClick={check}>
            {ready || current.correct.length === 1 ? t.practice.check : t.practice.pickToCheck(current.correct.length)}
          </button>
        ) : (
          <button type="button" className="primary" onClick={advance}>
            {last ? t.practice.summaryButton : t.next}
          </button>
        )}
      </div>
      <p className="hint">{t.practice.hint}</p>
    </div>
  )
}
