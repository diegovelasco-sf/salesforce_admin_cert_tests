// Ajustes: qué preguntas entran en el simulacro, exportar/importar el progreso y borrarlo.
import { useState, type ChangeEvent, type Dispatch } from 'react'
import { EXAM, OFFICIAL_SOURCES, SOURCE_LABELS } from '../domain/exam.ts'
import { filterPool, isDoubtful } from '../domain/sampling.ts'
import { emptyProgress, exportProgress, parseProgress, type Progress } from '../domain/storage.ts'
import { BANK } from './bank.ts'
import { ConfirmDialog } from './common.tsx'
import { plural } from './format.ts'
import type { Action } from './state.ts'

export function Settings({ progress, dispatch }: { progress: Progress; dispatch: Dispatch<Action> }) {
  const { settings } = progress
  const [pendingImport, setPendingImport] = useState<Progress | undefined>()
  const [importError, setImportError] = useState<string | undefined>()
  const [confirmReset, setConfirmReset] = useState(false)

  const doubtful = BANK.questions.filter(isDoubtful).length
  const official = BANK.questions.filter((q) => OFFICIAL_SOURCES.includes(q.source)).length
  const examPool = filterPool(BANK.questions, settings).length
  const update = (patch: Partial<Progress['settings']>) => dispatch({ type: 'settings/update', settings: patch })

  const download = () => {
    const blob = new Blob([exportProgress(progress)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `progreso-platform-admin-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      // Un simulacro a medias de otro momento puede no cuadrar con el banco actual: no se importa.
      setPendingImport({ ...parseProgress(await file.text()), activeExam: undefined })
      setImportError(undefined)
    } catch (error) {
      setImportError(`No se ha podido importar: ${(error as Error).message}`)
    }
  }

  const counts = Object.entries(SOURCE_LABELS).map(([source, label]) => `${label}: ${BANK.questions.filter((q) => q.source === source).length}`)

  return (
    <div className="settings">
      <h1>Ajustes</h1>

      <section className="card">
        <h2>Simulacro</h2>
        <label className="check">
          <input type="checkbox" checked={settings.excludeDoubtful} onChange={() => update({ excludeDoubtful: !settings.excludeDoubtful })} />
          Excluir las preguntas dudosas u obsoletas ({doubtful})
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.officialOnly} onChange={() => update({ officialOnly: !settings.officialOnly })} />
          Usar solo preguntas de fuentes oficiales ({official})
        </label>
        <p className="muted">
          Con estos ajustes el simulacro elige entre {plural(examPool, 'pregunta', 'preguntas')}.
          {examPool < EXAM.questionCount && ` No llegan a ${EXAM.questionCount}: el simulacro será más corto.`}
          {settings.officialOnly && ' Las fuentes oficiales no tienen preguntas de Agentforce.'}
        </p>
      </section>

      <section className="card">
        <h2>Tu progreso</h2>
        <p className="muted">
          Se guarda solo en este navegador. Exporta una copia de vez en cuando, o antes de cambiar de navegador o de borrar sus datos.
        </p>
        <div className="actions start">
          <button type="button" onClick={download}>
            Exportar progreso (JSON)
          </button>
          <label className="button">
            Importar progreso…
            <input type="file" accept="application/json,.json" className="sr-only" onChange={chooseFile} />
          </label>
          <button type="button" className="danger" onClick={() => setConfirmReset(true)}>
            Borrar todo el progreso
          </button>
        </div>
        {importError && <p className="status-bad">✗ {importError}</p>}
      </section>

      <section className="card">
        <h2>Banco de preguntas</h2>
        <p>
          {BANK.questions.length} preguntas · {counts.join(' · ')}
        </p>
        <p className="muted">
          Versión {BANK.hash}. Examen: {EXAM.questionCount} preguntas, {EXAM.durationMinutes} minutos y aprobado con el{' '}
          {EXAM.passPercent} % (guía oficial, CRT101). Las preguntas de FreeCram, Success4Exam y el Debrief no son oficiales, y algunas
          claves se han corregido o marcado como dudosas. En el Debrief y en las tarjetas de Trailhead, la fuente solo da la respuesta: las
          opciones incorrectas se han redactado aparte.
        </p>
      </section>

      <ConfirmDialog
        open={!!pendingImport}
        title="¿Reemplazar tu progreso?"
        confirmLabel="Reemplazar"
        danger
        onConfirm={() => {
          if (pendingImport) dispatch({ type: 'progress/replace', progress: pendingImport, notice: 'Progreso importado.' })
          setPendingImport(undefined)
        }}
        onCancel={() => setPendingImport(undefined)}
      >
        <p>
          El archivo tiene {plural(Object.keys(pendingImport?.stats ?? {}).length, 'pregunta respondida', 'preguntas respondidas')} y{' '}
          {plural(pendingImport?.history.length ?? 0, 'simulacro', 'simulacros')}. Sustituirá a tu progreso actual.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        title="¿Borrar todo el progreso?"
        confirmLabel="Borrar"
        danger
        onConfirm={() => {
          setConfirmReset(false)
          dispatch({ type: 'progress/replace', progress: emptyProgress(), notice: 'Progreso borrado.' })
        }}
        onCancel={() => setConfirmReset(false)}
      >
        <p>Se borrarán tus estadísticas, las marcas, el historial y el simulacro en curso. No se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  )
}
