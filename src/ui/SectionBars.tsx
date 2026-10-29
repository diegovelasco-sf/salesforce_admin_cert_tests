// Barras horizontales de % de acierto por sección, con la línea de aprobado y vista de tabla.
// Una sola serie: todas las barras van en el mismo color y el título dice qué se muestra.
import { useState } from 'react'
import { passes, type Tally } from '../domain/grading.ts'
import type { SectionKey } from '../domain/types.ts'
import { useCert } from './cert.ts'
import { percent } from './format.ts'
import { useI18n } from './lang.ts'
import { sectionText } from './messages.ts'

interface Props {
  title: string
  caption?: string
  tallies: Partial<Record<SectionKey, Tally>>
  /** Unidad que se cuenta, para el tooltip y la tabla. */
  unit?: 'questions' | 'answers'
}

export function SectionBars({ title, caption, tallies, unit = 'questions' }: Props) {
  const { cert } = useCert()
  const { t, lang } = useI18n()
  const passPercent = cert.exam.passPercent
  const unitText = t.bars.unit[unit]
  const [asTable, setAsTable] = useState(false)
  const rows = cert.sections.map((section) => {
    const tally = tallies[section.key]
    const value = tally?.total ? percent(tally.correct, tally.total) : undefined
    return { section, label: sectionText(section, lang), tally, value, below: !!tally?.total && !passes(tally.correct, tally.total, passPercent) }
  })

  return (
    <figure className="card chart">
      <div className="chart-head">
        <figcaption>
          <h2>{title}</h2>
          <p className="muted">{t.bars.passLine(caption, passPercent)}</p>
        </figcaption>
        <button type="button" className="link-button" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? t.bars.asChart : t.bars.asTable}
        </button>
      </div>

      {asTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t.bars.section}</th>
              <th scope="col">{t.bars.hits}</th>
              <th scope="col">{t.bars.totalOf(unitText)}</th>
              <th scope="col">{t.bars.hit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ section, label, tally, value, below }) => (
              <tr key={section.key}>
                <th scope="row">{label}</th>
                <td>{tally?.correct ?? 0}</td>
                <td>{tally?.total ?? 0}</td>
                <td>
                  {value === undefined ? t.noData : t.pct(value)}
                  {below && t.bars.below}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="bars">
          <ul className="bar-list">
            {rows.map(({ section, label, tally, value, below }) => (
              <li
                key={section.key}
                className="bar-row"
                tabIndex={0}
                aria-label={
                  value === undefined ? `${label}: ${t.noData}` : t.bars.rowLabel(label, t.pct(value), tally!.correct, tally!.total, unitText, below)
                }
              >
                <span className="bar-label">{label}</span>
                <span className="bar-track" aria-hidden="true">
                  {value !== undefined && <span className="bar" style={{ width: `${Math.max(value, 0.5)}%` }} />}
                  <span className="pass-line" style={{ left: `${passPercent}%` }} />
                </span>
                <span className="bar-value" aria-hidden="true">
                  {value === undefined ? '—' : t.pct(value)}
                  {below && <span className="bar-below"> ⚠</span>}
                </span>
                {value !== undefined && (
                  <span className="bar-tooltip" role="presentation">
                    <strong>{t.ofN(tally!.correct, tally!.total)}</strong> {unitText} · {t.pct(value)}
                    {below && t.bars.below}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="bar-axis" aria-hidden="true">
            <span className="bar-axis-track">
              <span className="tick" style={{ left: '0%' }}>
                {t.pct(0)}
              </span>
              <span className="tick tick-pass" style={{ left: `${passPercent}%` }}>
                {t.pct(passPercent)}
              </span>
              <span className="tick tick-end" style={{ left: '100%' }}>
                {t.pct(100)}
              </span>
            </span>
          </div>
          {rows.some((r) => r.below) && <p className="muted bar-legend">{t.bars.legend}</p>}
        </div>
      )}
    </figure>
  )
}
