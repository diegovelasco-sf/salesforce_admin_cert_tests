// Barras horizontales de % de acierto por sección, con la línea de aprobado y vista de tabla.
// Una sola serie: todas las barras van en el mismo color y el título dice qué se muestra.
import { useState } from 'react'
import { EXAM, SECTIONS } from '../domain/exam.ts'
import { passes, type Tally } from '../domain/grading.ts'
import type { SectionKey } from '../domain/types.ts'
import { percent } from './format.ts'

interface Props {
  title: string
  caption?: string
  tallies: Partial<Record<SectionKey, Tally>>
  /** Texto de la unidad en tooltip y tabla: "preguntas", "respuestas"… */
  unit?: string
}

export function SectionBars({ title, caption, tallies, unit = 'preguntas' }: Props) {
  const [asTable, setAsTable] = useState(false)
  const rows = SECTIONS.map((section) => {
    const tally = tallies[section.key]
    const value = tally?.total ? percent(tally.correct, tally.total) : undefined
    return { section, tally, value, below: !!tally?.total && !passes(tally.correct, tally.total) }
  })

  return (
    <figure className="card chart">
      <div className="chart-head">
        <figcaption>
          <h2>{title}</h2>
          <p className="muted">
            {caption ? `${caption} ` : ''}La línea vertical marca el aprobado ({EXAM.passPercent} %).
          </p>
        </figcaption>
        <button type="button" className="link-button" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>

      {asTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Sección</th>
              <th scope="col">Aciertos</th>
              <th scope="col">Total de {unit}</th>
              <th scope="col">Acierto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ section, tally, value, below }) => (
              <tr key={section.key}>
                <th scope="row">{section.label}</th>
                <td>{tally?.correct ?? 0}</td>
                <td>{tally?.total ?? 0}</td>
                <td>
                  {value === undefined ? 'sin datos' : `${value} %`}
                  {below && ' · por debajo del aprobado'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="bars">
          <ul className="bar-list">
            {rows.map(({ section, tally, value, below }) => (
              <li
                key={section.key}
                className="bar-row"
                tabIndex={0}
                aria-label={
                  value === undefined
                    ? `${section.label}: sin datos`
                    : `${section.label}: ${value} %, ${tally!.correct} de ${tally!.total} ${unit}${below ? ', por debajo del aprobado' : ''}`
                }
              >
                <span className="bar-label">{section.label}</span>
                <span className="bar-track" aria-hidden="true">
                  {value !== undefined && <span className="bar" style={{ width: `${Math.max(value, 0.5)}%` }} />}
                  <span className="pass-line" style={{ left: `${EXAM.passPercent}%` }} />
                </span>
                <span className="bar-value" aria-hidden="true">
                  {value === undefined ? '—' : `${value} %`}
                  {below && <span className="bar-below"> ⚠</span>}
                </span>
                {value !== undefined && (
                  <span className="bar-tooltip" role="presentation">
                    <strong>
                      {tally!.correct} de {tally!.total}
                    </strong>{' '}
                    {unit} · {value} %{below ? ' · por debajo del aprobado' : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="bar-axis" aria-hidden="true">
            <span className="bar-axis-track">
              <span className="tick" style={{ left: '0%' }}>
                0 %
              </span>
              <span className="tick tick-pass" style={{ left: `${EXAM.passPercent}%` }}>
                {EXAM.passPercent} %
              </span>
              <span className="tick tick-end" style={{ left: '100%' }}>
                100 %
              </span>
            </span>
          </div>
          {rows.some((r) => r.below) && <p className="muted bar-legend">⚠ Sección por debajo del aprobado.</p>}
        </div>
      )}
    </figure>
  )
}
