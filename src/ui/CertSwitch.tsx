// Selector de certificación. Cada una es independiente: su banco, su progreso y sus reglas.
import { CERTS } from '../domain/certs.ts'
import type { CertId } from '../domain/types.ts'
import { useI18n } from './lang.ts'

const ORDER: CertId[] = ['admin', 'appbuilder']

export function CertSwitch({ value, onChange }: { value: CertId; onChange: (cert: CertId) => void }) {
  const { t } = useI18n()
  return (
    <div className="segmented cert-switch" role="radiogroup" aria-label={t.app.certSwitchLabel}>
      {ORDER.map((id) => (
        <label key={id} className={`segment${value === id ? ' on' : ''}`}>
          <input type="radio" name="cert" checked={value === id} onChange={() => onChange(id)} />
          {CERTS[id].name}
        </label>
      ))}
    </div>
  )
}
