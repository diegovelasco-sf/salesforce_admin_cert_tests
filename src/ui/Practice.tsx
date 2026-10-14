// Práctica y repaso: configuración de la tanda, preguntas con corrección inmediata y resumen final.
import { useState, type Dispatch } from 'react'
import { OFFICIAL_SOURCES, SECTIONS } from '../domain/exam.ts'
import { isCorrect } from '../domain/grading.ts'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { filterPool, samplePractice } from '../domain/sampling.ts'
import { toggleSelection } from '../domain/selection.ts'
import type { Progress } from '../domain/storage.ts'
import type { SectionKey } from '../domain/types.ts'
import { BANK, question } from './bank.ts'
import { Stat } from './common.tsx'
import { percent, plural } from './format.ts'
import { QuestionCard } from './QuestionCard.tsx'
import { makeRun, type Action, type PracticeRun } from './state.ts'
import { useShortcuts } from './useShortcuts.ts'

const COUNTS = [10, 20, 40, 0] as const

export function PracticeSetup({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const [sections, setSections] = useState<SectionKey[]>(SECTIONS.map((s) => s.key))
  const [officialOnly, setOfficialOnly] = useState(progress.settings.officialOnly)
  const [unseenOnly, setUnseenOnly] = useState(false)
  const [count, setCount] = useState<number>(20)

  const base = filterPool(BANK.questions, { excludeDoubtful: false, officialOnly }).filter(
    (q) => !unseenOnly || !progress.stats[q.id],
  )
  const pool = base.filter((q) => sections.includes(q.section))
  const size = count === 0 ? pool.length : Math.min(count, pool.length)

  const toggleSection = (key: SectionKey) =>
    setSections((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))

  const start = () => {
    const rng = mulberry32(randomSeed())
    const questions = samplePractice(pool, size, rng)
    dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('Práctica', questions, rng) } })
  }

  return (
    <section className="card setup">
      <h1>Práctica</h1>
      <p className="muted">Respondes, compruebas y ves la explicación al momento. Cada respuesta cuenta para tus estadísticas.</p>

      <fieldset>
        <legend>Secciones</legend>
        <div className="checks">
          {SECTIONS.map((s) => (
            <label key={s.key} className="check">
              <input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggleSection(s.key)} />
              {s.label} <span className="muted">({base.filter((q) => q.section === s.key).length})</span>
            </label>
          ))}
        </div>
        <div className="inline-actions">
          <button type="button" className="link-button" onClick={() => setSections(SECTIONS.map((s) => s.key))}>
            Todas
          </button>
          <button type="button" className="link-button" onClick={() => setSections([])}>
            Ninguna
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Fuentes</legend>
        <label className="check">
          <input type="radio" name="sources" checked={!officialOnly} onChange={() => setOfficialOnly(false)} />
          Todas
        </label>
        <label className="check">
          <input type="radio" name="sources" checked={officialOnly} onChange={() => setOfficialOnly(true)} />
          Solo oficiales ({BANK.questions.filter((q) => OFFICIAL_SOURCES.includes(q.source)).length}: CRT101, ADX201 y Trailhead)
        </label>
        <label className="check">
          <input type="checkbox" checked={unseenOnly} onChange={() => setUnseenOnly(!unseenOnly)} />
          Solo preguntas que aún no has visto
        </label>
      </fieldset>

      <fieldset>
        <legend>Número de preguntas</legend>
        <div className="segmented">
          {COUNTS.map((n) => (
            <label key={n} className={`segment${count === n ? ' on' : ''}`}>
              <input type="radio" name="count" checked={count === n} onChange={() => setCount(n)} />
              {n === 0 ? 'Todas' : n}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="actions">
        <button type="button" onClick={() => dispatch({ type: 'navigate', screen: { name: 'home' } })}>
          Cancelar
        </button>
        <button type="button" className="primary" disabled={size === 0} onClick={start}>
          {size === 0 ? 'No hay preguntas con estos filtros' : `Empezar con ${plural(size, 'pregunta', 'preguntas')}`}
        </button>
      </div>
    </section>
  )
}

export function PracticeRunner({ run, progress, dispatch }: { run: PracticeRun; progress: Progress; dispatch: Dispatch<Action> }) {
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
        <h1>Resumen · {run.title}</h1>
        <div className="kpis">
          <Stat label="Acierto" value={`${percent(correctIds.length, run.checked.length)} %`} />
          <Stat label="Aciertos" value={`${correctIds.length} de ${run.checked.length}`} />
          <Stat label="Sin responder" value={total - run.checked.length} />
        </div>
        <div className="actions">
          <button type="button" onClick={() => dispatch({ type: 'navigate', screen: { name: 'home' } })}>
            Volver al inicio
          </button>
          {failed.length > 0 && (
            <button
              type="button"
              className="primary"
              onClick={() => {
                const rng = mulberry32(randomSeed())
                dispatch({ type: 'navigate', screen: { name: 'practice', run: makeRun('Falladas', failed.map(question), rng) } })
                setSummary(false)
              }}
            >
              Repetir las {plural(failed.length, 'fallada', 'falladas')}
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="runner">
      <div className="run-header">
        <h1>{run.title}</h1>
        <span className="muted">
          {run.checked.length} de {total} respondidas · {plural(correctIds.length, 'acierto', 'aciertos')}
        </span>
        <button type="button" className="link-button" onClick={() => setSummary(true)}>
          Terminar
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
        {checked ? (ok ? 'Correcto' : 'Incorrecto') : ''}
      </p>
      {checked && <p className={`verdict ${ok ? 'status-good' : 'status-bad'}`}>{ok ? '✓ ¡Correcto!' : '✗ Incorrecto'}</p>}

      <div className="actions">
        <button type="button" disabled={run.index === 0} onClick={() => go(run.index - 1)}>
          ← Anterior
        </button>
        {!checked ? (
          <button type="button" className="primary" disabled={!ready} onClick={check}>
            {ready || current.correct.length === 1 ? 'Comprobar' : `Elige ${current.correct.length} para comprobar`}
          </button>
        ) : (
          <button type="button" className="primary" onClick={advance}>
            {last ? 'Ver resumen' : 'Siguiente →'}
          </button>
        )}
      </div>
      <p className="hint">Atajos: 1-5 marcan opciones · Enter comprueba y avanza · ← anterior · M marca para repasar</p>
    </div>
  )
}
