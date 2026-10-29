// Ajustes: idioma, qué preguntas entran en el simulacro, exportar/importar el progreso y borrarlo.
import { useState, type ChangeEvent, type Dispatch } from 'react'
import { neededToPass } from '../domain/grading.ts'
import { SOURCE_LABELS } from '../domain/exam.ts'
import { filterPool, isDoubtful } from '../domain/sampling.ts'
import { emptyProgress, exportProgress, parseProgress, type Progress } from '../domain/storage.ts'
import type { SourceId } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { ConfirmDialog } from './common.tsx'
import { useI18n } from './lang.ts'
import { certTexts, sourceLabel, type Lang } from './messages.ts'
import type { Action } from './state.ts'

const LANGS: Lang[] = ['es', 'en']

export function Settings({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const { cert, bank } = useCert()
  const { t, lang, setLang } = useI18n()
  const texts = certTexts(cert, lang)
  const { exam: rules } = cert
  const hasOfficial = cert.officialSources.length > 0
  const { settings } = progress
  const [pendingImport, setPendingImport] = useState<Progress | undefined>()
  const [importError, setImportError] = useState<string | undefined>()
  const [confirmReset, setConfirmReset] = useState(false)

  const doubtful = bank.questions.filter(isDoubtful).length
  const official = bank.questions.filter((q) => cert.officialSources.includes(q.source)).length
  const examPool = filterPool(bank.questions, cert, settings).length
  const update = (patch: Partial<Progress['settings']>) => dispatch({ type: 'settings/update', settings: patch })

  const download = () => {
    const blob = new Blob([exportProgress(progress)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = t.settings.fileName(cert.slug, new Date().toISOString().slice(0, 10))
    link.click()
    URL.revokeObjectURL(url)
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      // Un simulacro a medias de otro momento puede no cuadrar con el banco actual: no se importa.
      // Y un progreso de otra certificación se rechaza: cada una tiene el suyo.
      setPendingImport({ ...parseProgress(await file.text(), cert.id), activeExam: undefined })
      setImportError(undefined)
    } catch (error) {
      setImportError((error as Error).message)
    }
  }

  const counts = (Object.keys(SOURCE_LABELS) as SourceId[])
    .map((source) => ({ label: sourceLabel(source, lang), n: bank.questions.filter((q) => q.source === source).length }))
    .filter(({ n }) => n > 0)
    .map(({ label, n }) => `${label}: ${n}`)

  return (
    <div className="settings">
      <h1>{t.settings.title(cert.name)}</h1>

      <section className="card">
        <h2>{t.settings.language}</h2>
        <div className="segmented" role="radiogroup" aria-label={t.settings.language}>
          {LANGS.map((option) => (
            <label key={option} className={`segment${lang === option ? ' on' : ''}`}>
              <input type="radio" name="lang" checked={lang === option} onChange={() => setLang(option)} />
              {t.settings.languageName(option)}
            </label>
          ))}
        </div>
        <p className="muted">{t.settings.languageNote}</p>
      </section>

      <section className="card">
        <h2>{t.settings.exam}</h2>
        <label className="check">
          <input type="checkbox" checked={settings.excludeDoubtful} onChange={() => update({ excludeDoubtful: !settings.excludeDoubtful })} />
          {t.settings.excludeDoubtful(doubtful)}
        </label>
        {hasOfficial && (
          <label className="check">
            <input type="checkbox" checked={settings.officialOnly} onChange={() => update({ officialOnly: !settings.officialOnly })} />
            {t.settings.officialOnly(official)}
          </label>
        )}
        <p className="muted">
          {t.settings.pool(examPool)}
          {examPool < rules.questionCount && t.settings.tooShort(rules.questionCount)}
          {hasOfficial && settings.officialOnly && texts.officialNote && ` ${texts.officialNote}`}
        </p>
      </section>

      <section className="card">
        <h2>{t.settings.progress}</h2>
        <p className="muted">{t.settings.progressText}</p>
        <div className="actions start">
          <button type="button" onClick={download}>
            {t.settings.export}
          </button>
          <label className="button">
            {t.settings.import}
            <input type="file" accept="application/json,.json" className="sr-only" onChange={chooseFile} />
          </label>
          <button type="button" className="danger" onClick={() => setConfirmReset(true)}>
            {t.settings.reset}
          </button>
        </div>
        {importError && <p className="status-bad">✗ {t.settings.importFailed(importError)}</p>}
      </section>

      <section className="card">
        <h2>{t.settings.bank}</h2>
        <p>{t.settings.bankCount(bank.questions.length, counts)}</p>
        <p className="muted">
          {t.settings.bankInfo(bank.hash, rules, neededToPass(rules.scoredCount, rules.passPercent), texts.guide, texts.sourcesNote)}
        </p>
      </section>

      <ConfirmDialog
        open={!!pendingImport}
        title={t.settings.importTitle}
        confirmLabel={t.settings.importConfirm}
        danger
        onConfirm={() => {
          if (pendingImport) dispatch({ type: 'progress/replace', progress: pendingImport, notice: { kind: 'imported' } })
          setPendingImport(undefined)
        }}
        onCancel={() => setPendingImport(undefined)}
      >
        <p>{t.settings.importBody(Object.keys(pendingImport?.stats ?? {}).length, pendingImport?.history.length ?? 0)}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        title={t.settings.resetTitle}
        confirmLabel={t.settings.resetConfirm}
        danger
        onConfirm={() => {
          setConfirmReset(false)
          dispatch({ type: 'progress/replace', progress: emptyProgress(cert.id), notice: { kind: 'reset' } })
        }}
        onCancel={() => setConfirmReset(false)}
      >
        <p>{t.settings.resetBody}</p>
      </ConfirmDialog>
    </div>
  )
}
