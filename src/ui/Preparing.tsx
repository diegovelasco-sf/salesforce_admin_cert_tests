// Certificación cuyo banco aún no está generado: se explica el formato del examen, sin preguntas.
import { neededToPass } from '../domain/grading.ts'
import { useCert } from './cert.ts'
import { useI18n } from './lang.ts'
import { sectionText } from './messages.ts'

export function Preparing() {
  const { cert } = useCert()
  const { t, lang } = useI18n()
  const { exam, sections } = cert
  return (
    <section className="card">
      <h1>{cert.name}</h1>
      <p>{t.preparing.text}</p>
      <p className="muted">
        {t.preparing.exam(
          exam,
          neededToPass(exam.scoredCount, exam.passPercent),
          sections.map((s) => `${sectionText(s, lang)} (${t.pct(s.weight)})`),
        )}
      </p>
      <p className="muted">{t.preparing.independent}</p>
    </section>
  )
}
