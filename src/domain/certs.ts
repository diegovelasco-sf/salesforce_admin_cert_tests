// Certificaciones de la app. Cada una tiene su formato de examen, sus secciones con el peso de la guía
// oficial, sus fuentes y sus textos. La de Platform Administrator sigue definida en exam.ts.
import { EXAM, OFFICIAL_SOURCES, SECTIONS, type Section } from './exam.ts'
import type { CertId, SectionKey, SourceId } from './types.ts'

export interface ExamConfig {
  questionCount: number
  /** Las que puntúan; el resto, hasta questionCount, son de reserva. */
  scoredCount: number
  durationMinutes: number
  passPercent: number
}

export interface CertConfig {
  id: CertId
  name: string
  /** Para nombrar el archivo de exportación. */
  slug: string
  exam: ExamConfig
  /** Secciones con su peso en %; el orden desempata el reparto de preguntas. */
  sections: readonly Section[]
  /** Fuentes oficiales. Vacío si la certificación no tiene: entonces no hay filtro «solo oficiales». */
  officialSources: readonly SourceId[]
  /** Nombres de las fuentes oficiales, tal como se listan en la práctica. Vacío si no hay. */
  officialNames: string
  footer: string
  /** Guía que fija el formato del examen, tal como se cita en Ajustes. */
  guide: string
  /** Qué fuentes tiene el banco y en qué estado están, tal como se cuenta en Ajustes. */
  sourcesNote: string
  /** Aviso que sale con el filtro «solo oficiales» y que explica un hueco de la fuente oficial. */
  officialNote: string
}

export const CERTS: Record<CertId, CertConfig> = {
  admin: {
    id: 'admin',
    name: 'Platform Administrator',
    slug: 'platform-admin',
    exam: EXAM,
    sections: SECTIONS,
    officialSources: OFFICIAL_SOURCES,
    officialNames: 'CRT101, ADX201 y Trailhead',
    footer:
      'Uso personal. Preguntas de los cursos oficiales CRT101 y ADX201 de Trailhead Academy y del módulo de preparación de Trailhead, y de las fuentes no oficiales FreeCram, Success4Exam y Debrief (con claves revisadas). Tu progreso se guarda solo en este navegador.',
    guide: 'guía oficial, CRT101',
    sourcesNote:
      'Las preguntas de FreeCram, Success4Exam y el Debrief no son oficiales, y algunas claves se han corregido o marcado como dudosas. En el Debrief y en las tarjetas de Trailhead, la fuente solo da la respuesta: las opciones incorrectas se han redactado aparte.',
    officialNote: 'Las fuentes oficiales no tienen preguntas de Agentforce.',
  },
  appbuilder: {
    id: 'appbuilder',
    name: 'Platform App Builder',
    slug: 'platform-app-builder',
    // Guía oficial (SU '26): 60 preguntas puntuadas y hasta 5 sin puntuar, 105 minutos y 73 % para aprobar (44 de 60).
    exam: { questionCount: 65, scoredCount: 60, durationMinutes: 105, passPercent: 73 },
    sections: [
      { key: 'fundamentals', label: 'Fundamentos de Salesforce', labelEn: 'Salesforce Fundamentals', weight: 18 },
      { key: 'datamodel', label: 'Modelado de datos y gestión', labelEn: 'Data Modeling and Management', weight: 20 },
      { key: 'logic', label: 'Lógica de negocio y automatización de procesos', labelEn: 'Business Logic and Process Automation', weight: 32 },
      { key: 'ui', label: 'Interfaz de usuario', labelEn: 'User Interface', weight: 17 },
      { key: 'deployment', label: 'Despliegue de aplicaciones', labelEn: 'App Deployment', weight: 13 },
    ],
    officialSources: [],
    officialNames: '',
    footer: 'Uso personal. Preguntas de FreeCram y de la demo de Success4Exam, no oficiales. Tu progreso se guarda solo en este navegador.',
    guide: "guía oficial de Platform App Builder, SU '26",
    sourcesNote:
      'Son preguntas de FreeCram y de la demo de Success4Exam, no oficiales. Las repetidas entre fuentes se han unificado, y las claves corregidas o dudosas se indican en cada pregunta.',
    officialNote: '',
  },
}

export const sectionLabel = (cert: CertConfig, key: SectionKey): string => cert.sections.find((s) => s.key === key)?.label ?? key
