// Piezas pequeñas compartidas: diálogo de confirmación y fichas de KPI.
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Diálogo modal nativo: atrapa el foco y se cierra con Escape. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Cancelar', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={() => open && onCancel()}>
      <h2 id={titleId}>{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="actions">
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

interface StatProps {
  label: string
  value: ReactNode
  detail?: ReactNode
}

/** Ficha de KPI: etiqueta, valor y detalle opcional. */
export function Stat({ label, value, detail }: StatProps) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  )
}

/** Resultado aprobado/suspendido: icono + texto, nunca solo color. */
export function PassBadge({ passed }: { passed: boolean }) {
  return <span className={`status ${passed ? 'status-good' : 'status-bad'}`}>{passed ? '✓ Aprobado' : '✗ Suspendido'}</span>
}
