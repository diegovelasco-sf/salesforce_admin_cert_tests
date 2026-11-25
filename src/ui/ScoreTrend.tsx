// Evolución de la nota de los simulacros: una sola serie (línea de 2 px con puntos), eje 0-100 %, línea
// discontinua del aprobado, tooltip en cada punto (también con el teclado) y vista de tabla.
import { useState } from 'react'
import type { ExamRecord } from '../domain/storage.ts'
import { useCert } from './cert.ts'
import { PassBadge } from './common.tsx'
import { formatDate, percent } from './format.ts'
import { useI18n } from './lang.ts'

const W = 640
const H = 200
const PAD = { top: 12, right: 16, bottom: 24, left: 40 }

export function ScoreTrend({ history }: { history: readonly ExamRecord[] }) {
  const { cert } = useCert()
  const { t } = useI18n()
  const [asTable, setAsTable] = useState(false)
  const [active, setActive] = useState<number | undefined>()
  const pass = cert.exam.passPercent
  const points = history.map((e, i) => ({ i, score: percent(e.correct, e.total), exam: e }))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / 100) * innerH
  const path = points.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.score)}`).join(' ')
  const label = (p: (typeof points)[number]) => t.history.trendPoint(p.i + 1, formatDate(p.exam.submittedAt, t.locale), t.pct(p.score), p.exam.passed)
  const shown = active === undefined ? undefined : points[active]

  return (
    <figure className="card chart">
      <div className="chart-head">
        <figcaption>
          <h2>{t.history.trendTitle}</h2>
          <p className="muted">{t.history.trendCaption(pass)}</p>
        </figcaption>
        <button type="button" className="link-button" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? t.bars.asChart : t.bars.asTable}
        </button>
      </div>
      {asTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t.history.date}</th>
              <th scope="col">{t.history.score}</th>
              <th scope="col">{t.history.result}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.exam.startedAt}>
                <th scope="row">{p.i + 1}</th>
                <td>{formatDate(p.exam.submittedAt, t.locale)}</td>
                <td>{t.pct(p.score)}</td>
                <td>
                  <PassBadge passed={p.exam.passed} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="trend" onPointerLeave={() => setActive(undefined)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg" role="img" aria-label={t.history.trendTitle}>
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line className="trend-grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
                <text className="trend-tick" x={PAD.left - 6} y={y(v)} dy="0.35em" textAnchor="end">
                  {t.pct(v)}
                </text>
              </g>
            ))}
            <line className="trend-pass" x1={PAD.left} x2={W - PAD.right} y1={y(pass)} y2={y(pass)} />
            <text className="trend-tick" x={PAD.left + 4} y={y(pass) - 4} textAnchor="start">
              {t.pct(pass)}
            </text>
            {points.length > 1 && <path className="trend-line" d={path} />}
            {points.map((p) => (
              <g key={p.exam.startedAt}>
                {/* Zona de toque mayor que el punto. */}
                <circle
                  className="trend-hit"
                  cx={x(p.i)}
                  cy={y(p.score)}
                  r={14}
                  tabIndex={0}
                  role="img"
                  aria-label={label(p)}
                  onPointerEnter={() => setActive(p.i)}
                  onFocus={() => setActive(p.i)}
                  onBlur={() => setActive(undefined)}
                />
                <circle className={`trend-dot${active === p.i ? ' on' : ''}`} cx={x(p.i)} cy={y(p.score)} r={active === p.i ? 6 : 4} />
              </g>
            ))}
            {points.length > 0 && (
              <text className="trend-end" x={x(points.at(-1)!.i)} y={y(points.at(-1)!.score) - 10} textAnchor="middle">
                {t.pct(points.at(-1)!.score)}
              </text>
            )}
          </svg>
          {shown && (
            <div
              className="trend-tooltip"
              role="presentation"
              style={{ left: `${(x(shown.i) / W) * 100}%`, top: `${(y(shown.score) / H) * 100}%` }}
            >
              <strong>{t.pct(shown.score)}</strong> · {formatDate(shown.exam.submittedAt, t.locale)}
              <br />
              <PassBadge passed={shown.exam.passed} />
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
