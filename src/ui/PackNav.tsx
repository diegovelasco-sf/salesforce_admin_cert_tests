// Navegación de una tanda de estudio: volver a los grupos, repetir el paquete entero o solo sus falladas, y
// pasar a cualquier otro paquete del mismo grupo. Sale encima de las preguntas y en el resumen final.
import { useState, type Dispatch } from 'react'
import type { Progress } from '../domain/storage.ts'
import { packProgress, packQuestions } from '../domain/study.ts'
import { useCert } from './cert.ts'
import { ConfirmDialog } from './common.tsx'
import { useI18n } from './lang.ts'
import { sectionName } from './messages.ts'
import { startPack } from './modes.ts'
import type { Action } from './state.ts'

interface Props {
  pack: { plan: string; index: number }
  progress: Progress
  dispatch: Dispatch<Action>
  /** Respuestas comprobadas en la tanda: si hay alguna sin acabar la tanda, se confirma antes de salir. */
  answered: number
  /** La tanda ya terminó (resumen): no hace falta confirmar. */
  finished?: boolean
  /** Se llama justo antes de empezar otra tanda (para cerrar el resumen). */
  onLeave?: () => void
}

type Target = { kind: 'study' } | { kind: 'pack'; index: number; filter: 'all' | 'failed' }

export function PackNav({ pack, progress, dispatch, answered, finished, onLeave }: Props) {
  const { cert, question } = useCert()
  const { t, lang } = useI18n()
  const [pending, setPending] = useState<Target | undefined>()
  const plan = progress.studyPlans.find((p) => p.id === pack.plan)
  if (!plan) return null
  const current = plan.packs[pack.index]
  const failed = current ? packQuestions(current, 'failed', plan.stats, progress.flagged).length : 0
  const name = plan.sections?.map((key) => sectionName(cert, key, lang)).join(', ') || t.study.allSections

  const go = (target: Target) => {
    onLeave?.()
    if (target.kind === 'study') dispatch({ type: 'navigate', screen: { name: 'study' } })
    else startPack(dispatch, progress, { plan: plan.id, index: target.index }, target.filter, question)
  }
  // Salir a mitad de una tanda no pierde nada (cada respuesta ya cuenta), pero se pregunta para no hacerlo sin querer.
  const ask = (target: Target) => (finished || answered === 0 ? go(target) : setPending(target))

  return (
    <nav className="card pack-nav" aria-label={t.packNav.label}>
      <div className="pack-nav-row">
        <button type="button" className="link-button" onClick={() => ask({ kind: 'study' })}>
          {t.packNav.back}
        </button>
        <span className="muted pack-nav-group">{t.packNav.group(name)}</span>
      </div>
      <div className="pack-nav-row">
        <button type="button" onClick={() => ask({ kind: 'pack', index: pack.index, filter: 'all' })}>
          {t.packNav.repeatAll(current?.length ?? 0)}
        </button>
        <button type="button" disabled={!failed} onClick={() => ask({ kind: 'pack', index: pack.index, filter: 'failed' })}>
          {t.study.repeatFailed(failed)}
        </button>
      </div>
      {plan.packs.length > 1 && (
        <div className="pack-nav-row">
          <span className="pack-nav-label">{t.packNav.packs}</span>
          <ol className="pack-nav-list">
            {plan.packs.map((p, i) => {
              const done = packProgress(p, plan.stats)
              const isCurrent = i === pack.index
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`pack-nav-item${isCurrent ? ' current' : ''}${done.mastered === done.total ? ' done' : ''}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={t.packNav.item(i + 1, done.mastered, done.total, isCurrent)}
                    title={t.packNav.item(i + 1, done.mastered, done.total, isCurrent)}
                    onClick={() => ask({ kind: 'pack', index: i, filter: 'all' })}
                  >
                    {i + 1}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
      <ConfirmDialog
        open={!!pending}
        title={t.packNav.leaveTitle}
        confirmLabel={t.packNav.leaveConfirm}
        onConfirm={() => {
          const target = pending!
          setPending(undefined)
          go(target)
        }}
        onCancel={() => setPending(undefined)}
      >
        <p>{t.packNav.leaveBody}</p>
      </ConfirmDialog>
    </nav>
  )
}
