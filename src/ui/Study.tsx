// Modo estudio: crea los paquetes fijos y muestra el dominio de cada uno, con sus tres formas de repetirlo.
import { useState, type Dispatch } from 'react'
import { mulberry32, randomSeed } from '../domain/rng.ts'
import { filterPool, inSources, isDoubtful } from '../domain/sampling.ts'
import type { Progress } from '../domain/storage.ts'
import { PACK_SIZES, buildPacks, packProgress, packQuestions, type PackFilter, type PackSize, type StudyPlan } from '../domain/study.ts'
import type { SectionKey, SourceId } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { ConfirmDialog } from './common.tsx'
import { useI18n } from './lang.ts'
import { sectionName, sectionText, sourceLabel } from './messages.ts'
import { SourcePicker } from './SourcePicker.tsx'
import { startPack } from './modes.ts'
import type { Action } from './state.ts'

export function Study({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const { t } = useI18n()
  const plan = progress.study
  const [rebuilding, setRebuilding] = useState(false)
  return (
    <div className="study">
      <h1>{t.study.title}</h1>
      <p className="muted">{t.study.intro}</p>
      {plan && !rebuilding ? (
        <PackList plan={plan} progress={progress} dispatch={dispatch} onRebuild={() => setRebuilding(true)} />
      ) : (
        <StudySetup progress={progress} dispatch={dispatch} onCancel={plan ? () => setRebuilding(false) : undefined} onDone={() => setRebuilding(false)} />
      )}
    </div>
  )
}

function StudySetup({
  progress,
  dispatch,
  onCancel,
  onDone,
}: {
  progress: Progress
  dispatch: Dispatch<Action>
  onCancel?: () => void
  onDone: () => void
}) {
  const { cert, bank } = useCert()
  const { t, lang } = useI18n()
  const current = progress.study
  const allSections = cert.sections.map((s) => s.key)
  const [size, setSize] = useState<PackSize>(current?.size ?? 30)
  const [sources, setSources] = useState<SourceId[] | undefined>(current?.sources ?? progress.settings.sources.study)
  const [sections, setSections] = useState<SectionKey[]>(current?.sections ?? allSections)
  const [excludeDoubtful, setExcludeDoubtful] = useState(current?.excludeDoubtful ?? true)
  const [confirm, setConfirm] = useState(false)
  // Cada filtro cuenta sus opciones con el otro aplicado: las fuentes, dentro de las secciones elegidas, y al revés.
  const doubtfulOk = filterPool(bank.questions, { excludeDoubtful })
  const unsourced = doubtfulOk.filter((q) => sections.includes(q.section))
  const sectionless = doubtfulOk.filter((q) => inSources(q, sources))
  const pool = unsourced.filter((q) => inSources(q, sources))
  const packs = Math.max(pool.length ? 1 : 0, Math.round(pool.length / size))
  const toggleSection = (key: SectionKey) =>
    setSections((list) => (list.includes(key) ? list.filter((k) => k !== key) : allSections.filter((k) => k === key || list.includes(k))))
  const everySection = allSections.every((k) => sections.includes(k))

  const create = (now: number) => {
    const plan: StudyPlan = {
      size,
      ...(sources ? { sources } : {}),
      ...(everySection ? {} : { sections }),
      excludeDoubtful,
      packs: buildPacks(pool, cert, size, mulberry32(randomSeed())),
      stats: {},
      createdAt: now,
    }
    const { study: _old, ...rest } = progress.settings.sources
    dispatch({ type: 'settings/update', settings: { sources: sources ? { ...rest, study: sources } : rest } })
    dispatch({ type: 'study/plan', plan })
    setConfirm(false)
    onDone()
  }

  return (
    <section className="card setup">
      <h2>{t.study.setupTitle}</h2>
      <fieldset>
        <legend>{t.study.size}</legend>
        <div className="segmented">
          {PACK_SIZES.map((n) => (
            <label key={n} className={`segment${size === n ? ' on' : ''}`}>
              <input type="radio" name="pack-size" checked={size === n} onChange={() => setSize(n)} />
              {t.study.sizeOption(n)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.study.sectionsLegend}</legend>
        <div className="checks">
          {cert.sections.map((s) => (
            <label key={s.key} className="check">
              <input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggleSection(s.key)} />
              {sectionText(s, lang)} <span className="muted">({sectionless.filter((q) => q.section === s.key).length})</span>
            </label>
          ))}
        </div>
        <div className="inline-actions">
          <button type="button" className="link-button" onClick={() => setSections(allSections)}>
            {t.all}
          </button>
          <button type="button" className="link-button" onClick={() => setSections([])}>
            {t.none}
          </button>
        </div>
        {!everySection && sections.length > 0 && <p className="muted">{t.study.sectionsNote}</p>}
      </fieldset>
      <fieldset>
        <legend>{t.study.sources}</legend>
        <SourcePicker value={sources} onChange={setSources} questions={unsourced} name={t.study.sources} />
        <label className="check">
          <input type="checkbox" checked={excludeDoubtful} onChange={() => setExcludeDoubtful(!excludeDoubtful)} />
          {t.study.excludeDoubtful(bank.questions.filter(isDoubtful).length)}
        </label>
      </fieldset>
      <p>{t.study.preview(pool.length, packs)}</p>
      <div className="actions">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
        <button type="button" className="primary" disabled={!pool.length} onClick={(e) => (current ? setConfirm(true) : create(e.timeStamp + performance.timeOrigin))}>
          {current ? t.study.recreate : t.study.create}
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title={t.study.recreateTitle}
        confirmLabel={t.study.recreateConfirm}
        danger
        onConfirm={() => create(performance.timeOrigin + performance.now())}
        onCancel={() => setConfirm(false)}
      >
        <p>{t.study.recreateBody}</p>
      </ConfirmDialog>
    </section>
  )
}

function PackList({ plan, progress, dispatch, onRebuild }: { plan: StudyPlan; progress: Progress; dispatch: Dispatch<Action>; onRebuild: () => void }) {
  const { cert, question, byId } = useCert()
  const { t, lang } = useI18n()
  const total = plan.packs.reduce((n, p) => n + p.length, 0)
  const mastered = plan.packs.reduce((n, p) => n + packProgress(p, plan.stats).mastered, 0)
  const sources = plan.sources?.map((s) => sourceLabel(s, lang)).join(', ') || t.study.allSources
  const sections = plan.sections?.map((key) => sectionName(cert, key, lang)).join(', ') || t.study.allSections

  return (
    <>
      <div className="study-head">
        <p>
          <strong>{t.study.totalMastered(mastered, total)}</strong>
          <br />
          <span className="muted">{t.study.planInfo(total, plan.packs.length, plan.size, sources, sections)}</span>
        </p>
        <button type="button" className="link-button" onClick={onRebuild}>
          {t.study.recreate}
        </button>
      </div>
      <ol className="pack-list">
        {plan.packs.map((pack, index) => {
          const p = packProgress(pack, plan.stats)
          const flagged = pack.filter((id) => progress.flagged.includes(id)).length
          const failed = packQuestions(pack, 'failed', plan.stats, progress.flagged).length
          const done = p.mastered === p.total
          const mix = cert.sections
            .map((s) => [s.key, pack.filter((id) => byId.get(id)?.section === s.key).length] as const)
            .filter(([, n]) => n > 0)
            .map(([key, n]) => `${sectionName(cert, key, lang)} ${n}`)
            .join(' · ')
          const start = (filter: PackFilter) => startPack(dispatch, progress, index, filter, question)
          return (
            <li key={index} className={`card pack${done ? ' pack-done' : ''}`}>
              <div className="pack-head">
                <h2>{t.study.pack(index + 1)}</h2>
                {done && <span className="status status-good">{t.study.packDone}</span>}
              </div>
              <div
                className="meter"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={p.total}
                aria-valuenow={p.mastered}
                aria-label={`${t.study.pack(index + 1)}: ${t.study.packMeter(p.mastered, p.total)}`}
              >
                <span className="meter-fill" style={{ width: `${(p.mastered / p.total) * 100}%` }} />
              </div>
              <p className="pack-stats">
                <strong>{t.study.packMeter(p.mastered, p.total)}</strong>
                <span className="muted">
                  {' '}
                  · {t.study.packCounts(p.new, p.learning)}
                  {flagged > 0 && ` · ${t.study.flaggedCount(flagged)}`}
                </span>
              </p>
              <p className="muted pack-mix">{t.study.sections(mix)}</p>
              <div className="actions start">
                <button type="button" className="primary" onClick={() => start('all')}>
                  {t.study.repeatAll(pack.length)}
                </button>
                <button type="button" disabled={!failed} onClick={() => start('failed')}>
                  {t.study.repeatFailed(failed)}
                </button>
                <button type="button" disabled={!flagged} onClick={() => start('flagged')}>
                  {t.study.repeatFlagged(flagged)}
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
