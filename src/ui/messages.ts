// Textos de la interfaz en los dos idiomas. `es` define la forma: `en` tiene exactamente sus mismas claves.
//
// Dos modos, un solo selector global:
// - `es` («Inglés / español»): interfaz en español, preguntas en inglés tal como vienen en la fuente y
//   explicaciones en español.
// - `en` («Todo en inglés»): interfaz y explicaciones en inglés. Las preguntas sin explicación en inglés
//   aparecen como pendientes.
import type { CertConfig, ExamConfig } from '../domain/certs.ts'
import { SOURCE_LABELS, type Section } from '../domain/exam.ts'
import type { ReviewStatus, SectionKey, SourceId } from '../domain/types.ts'
import { plural } from './format.ts'
import type { Notice, RunKind } from './state.ts'

export type Lang = 'es' | 'en'

const es = {
  locale: 'es-ES',
  pct: (n: number) => `${n} %`,
  ofN: (a: number, b: number) => `${a} de ${b}`,
  cancel: 'Cancelar',
  close: 'Cerrar',
  all: 'Todas',
  none: 'Ninguna',
  previous: '← Anterior',
  next: 'Siguiente →',
  backHome: 'Volver al inicio',
  noData: 'sin datos',
  passed: '✓ Aprobado',
  failed: '✗ Suspendido',

  app: {
    brandSub: 'simulador',
    docTitle: (cert: string) => `${cert} · Simulador`,
    navLabel: 'Principal',
    nav: { home: 'Inicio', history: 'Historial', settings: 'Ajustes' },
    certSwitchLabel: 'Certificación',
  },

  notice: (n: Notice, sectionName: (key: SectionKey) => string): string => {
    switch (n.kind) {
      case 'backup':
        return `Los datos guardados estaban dañados o eran de otra versión. Se ha hecho una copia en localStorage («${n.key}») y se ha empezado de cero.`
      case 'expired':
        return 'El tiempo del simulacro se agotó mientras no estabas: se ha entregado.'
      case 'bank-changed':
        return 'El banco de preguntas ha cambiado desde que empezaste el simulacro, así que no se puede reanudar.'
      case 'imported':
        return 'Progreso importado.'
      case 'reset':
        return 'Progreso borrado.'
      case 'short-exam':
        return `Con tus ajustes solo hay ${n.available} preguntas disponibles, así que el simulacro es más corto que el real.`
      case 'shortfall':
        return `No hay preguntas suficientes de ${n.sections.map(sectionName).join(', ')}: su hueco se ha cubierto con otras secciones.`
    }
  },

  runTitle: { practice: 'Práctica', review: 'Repaso', failed: 'Falladas', 'exam-failed': 'Falladas del simulacro' } satisfies Record<RunKind, string>,

  home: {
    resumeLabel: 'Simulacro a medias',
    resumeTitle: 'Tienes un simulacro a medias',
    resumeText: (time: string, answered: number, total: number) =>
      `Quedan ${time} · ${plural(answered, 'pregunta contestada', 'preguntas contestadas')} de ${total}. El tiempo sigue corriendo aunque cierres la página.`,
    discard: 'Descartar',
    resume: 'Reanudar',
    practiceTitle: 'Práctica',
    practiceText: 'Compruebas cada respuesta al momento y ves la explicación. Puedes filtrar por sección y por fuente.',
    practiceButton: 'Practicar',
    examTitle: 'Simulacro',
    examText: (rules: ExamConfig, needed: number) =>
      `${rules.questionCount} preguntas repartidas como en el examen (${rules.scoredCount} puntúan y ${rules.questionCount - rules.scoredCount} son de reserva, y se revelan al entregar), ${rules.durationMinutes} minutos y aprobado con el ${rules.passPercent} % (${needed} de ${rules.scoredCount}). La corrección llega al entregar.`,
    examButton: 'Empezar simulacro',
    examBlocked: 'Ya tienes uno a medias',
    reviewTitle: 'Repaso',
    reviewText: (n: number) =>
      n
        ? `${plural(n, 'pregunta pendiente', 'preguntas pendientes')}: las que has fallado y las que has marcado. Salen al acertarlas dos veces seguidas.`
        : 'Aquí aparecerán las preguntas que falles o marques, hasta que las aciertes dos veces seguidas.',
    reviewButton: 'Repasar',
    progressLabel: 'Tu progreso',
    seen: 'Preguntas vistas',
    globalHit: 'Acierto global',
    answers: (n: number) => plural(n, 'respuesta', 'respuestas'),
    inReview: 'En repaso',
    lastExam: 'Último simulacro',
    lastPassed: '✓ aprobado',
    lastFailed: '✗ suspendido',
    discardTitle: '¿Descartar el simulacro?',
    discardBody: 'Se perderán sus respuestas y no contará en el historial.',
  },

  practice: {
    title: 'Práctica',
    intro: 'Respondes, compruebas y ves la explicación al momento. Cada respuesta cuenta para tus estadísticas.',
    sections: 'Secciones',
    sources: 'Fuentes',
    officialOnly: (n: number, names: string) => `Solo oficiales (${n}: ${names})`,
    unseenOnly: 'Solo preguntas que aún no has visto',
    count: 'Número de preguntas',
    exactCount: 'Número exacto de preguntas',
    exactRange: (max: number) => `Entre 1 y ${max}`,
    fewer: 'Quitar una pregunta',
    more: 'Añadir una pregunta',
    noneFound: 'No hay preguntas con estos filtros',
    start: (n: number) => `Empezar con ${plural(n, 'pregunta', 'preguntas')}`,
    summary: (title: string) => `Resumen · ${title}`,
    hit: 'Acierto',
    hits: 'Aciertos',
    unanswered: 'Sin responder',
    repeatFailed: (n: number) => `Repetir las ${plural(n, 'fallada', 'falladas')}`,
    progress: (checked: number, total: number, correct: number) => `${checked} de ${total} respondidas · ${plural(correct, 'acierto', 'aciertos')}`,
    finish: 'Terminar',
    srRight: 'Correcto',
    srWrong: 'Incorrecto',
    right: '✓ ¡Correcto!',
    wrong: '✗ Incorrecto',
    check: 'Comprobar',
    pickToCheck: (n: number) => `Elige ${n} para comprobar`,
    summaryButton: 'Ver resumen',
    hint: 'Atajos: 1-5 marcan opciones · Enter comprueba y avanza · ← anterior · M marca para repasar',
  },

  exam: {
    panelLabel: 'Estado del simulacro',
    timerLabel: 'Tiempo restante',
    timerWarning: '⚠ Quedan menos de 5 minutos',
    counts: (answered: number, total: number, flagged: number) => `${answered} de ${total} contestadas · ${plural(flagged, 'marcada', 'marcadas')}`,
    submitExam: 'Entregar simulacro',
    submit: 'Entregar',
    hint: 'Atajos: 1-5 marcan opciones · Enter o → siguiente · ← anterior · M marca para revisar',
    confirmTitle: '¿Entregar el simulacro?',
    keepGoing: 'Seguir con el examen',
    pending: (n: number) => `Te quedan ${plural(n, 'pregunta', 'preguntas')} sin contestar; contarán como falladas.`,
    allAnswered: 'Has contestado todas las preguntas.',
    flagged: (n: number) => `Tienes ${plural(n, 'pregunta marcada', 'preguntas marcadas')} para revisar.`,
    rules: (rules: ExamConfig, needed: number) =>
      `Necesitas un ${rules.passPercent} % para aprobar (${needed} de ${rules.scoredCount} puntuadas; ${rules.questionCount - rules.scoredCount} de las ${rules.questionCount} son de reserva y no sabrás cuáles hasta entregar). Al entregar verás la corrección y no podrás cambiar las respuestas.`,
    paletteLabel: 'Preguntas del simulacro',
    paletteItem: (n: number, answered: boolean, flagged: boolean) =>
      `Pregunta ${n}: ${answered ? 'contestada' : 'sin contestar'}${flagged ? ', marcada' : ''}`,
    legendAnswered: 'contestada',
    legendFlagged: 'marcada',
    legendCurrent: 'actual',
  },

  card: {
    number: (n: number, total: number) => `Pregunta ${n} de ${total}`,
    flagOn: (context: 'exam' | 'practice'): string => (context === 'exam' ? '★ Marcada para revisar' : '★ Marcada para repasar'),
    flagOff: (context: 'exam' | 'practice'): string => (context === 'exam' ? '☆ Marcar para revisar' : '☆ Marcar para repasar'),
    chooseN: (max: number, selected: number) => `Elige ${max} · ${selected} de ${max} marcadas`,
    options: 'Opciones',
    verdictRight: '✓ Correcta',
    verdictMissed: '✓ Correcta, no la marcaste',
    verdictWrong: '✗ Tu respuesta',
    explanation: 'Explicación',
    review: { corrected: 'Clave corregida', disputed: 'Respuesta dudosa', outdated: 'Pregunta desactualizada' } satisfies Record<
      Exclude<ReviewStatus, 'ok'>,
      string
    >,
    sourceGave: (text: string) => ` La fuente daba como correcta: «${text}».`,
    authored: 'La fuente solo traía la pregunta y su respuesta: las opciones incorrectas se han redactado aparte para poder practicarla.',
    pending: 'Explicación pendiente: todavía no está redactada para esta pregunta.',
    learnMore: 'Para saber más',
  },

  results: {
    srTitle: 'Resultado del simulacro',
    yourScore: 'Tu nota',
    passMark: (cert: string, passPercent: number, needed: number, total: number) =>
      `${cert}: el aprobado está en el ${passPercent} %, ${needed} de ${total} preguntas.`,
    reserveNote: (n: number) => ` ${plural(n, 'pregunta era', 'preguntas eran')} de reserva y no puntúan.`,
    hits: 'Aciertos',
    unanswered: 'Sin contestar',
    unansweredDetail: 'cuentan como falladas',
    flagged: 'Marcadas',
    flaggedDetail: 'pasan a Repaso',
    timeUsed: 'Tiempo usado',
    timeOf: (total: string) => `de ${total}`,
    barsTitle: 'Acierto por sección',
    reviewTitle: 'Corrección',
    filterLabel: 'Qué preguntas mostrar',
    filterFailed: (n: number) => `Falladas (${n})`,
    filterFlagged: (n: number) => `Marcadas (${n})`,
    filterAll: (n: number) => `Todas (${n})`,
    emptyFilter: 'No hay preguntas en este filtro.',
    right: '✓ Acierto',
    wrong: '✗ Fallo',
    skipped: '– Sin contestar',
    reserveTag: ' · no puntúa',
    practiceFailed: (n: number) => `Practicar las ${plural(n, 'fallada', 'falladas')}`,
  },

  history: {
    title: 'Historial',
    exams: 'Simulacros',
    passed: 'Aprobados',
    best: 'Mejor nota',
    recent: 'Media reciente',
    lastN: (n: number) => `últimos ${n}`,
    barsTitle: 'Acierto acumulado por sección',
    barsCaption: 'Todas tus respuestas en práctica, repaso y simulacros.',
    none: 'Aún no has hecho ningún simulacro.',
    date: 'Fecha',
    score: 'Nota',
    hits: 'Aciertos',
    time: 'Tiempo',
    result: 'Resultado',
  },

  bars: {
    unit: { questions: 'preguntas', answers: 'respuestas' },
    passLine: (caption: string | undefined, passPercent: number) =>
      `${caption ? `${caption} ` : ''}La línea vertical marca el aprobado (${passPercent} %).`,
    asChart: 'Ver gráfico',
    asTable: 'Ver como tabla',
    section: 'Sección',
    hits: 'Aciertos',
    totalOf: (unit: string) => `Total de ${unit}`,
    hit: 'Acierto',
    below: ' · por debajo del aprobado',
    rowLabel: (label: string, value: string, correct: number, total: number, unit: string, below: boolean) =>
      `${label}: ${value}, ${correct} de ${total} ${unit}${below ? ', por debajo del aprobado' : ''}`,
    legend: '⚠ Sección por debajo del aprobado.',
  },

  settings: {
    title: (cert: string) => `Ajustes · ${cert}`,
    language: 'Idioma',
    languageName: (lang: Lang): string => (lang === 'es' ? 'Inglés / español' : 'Todo en inglés'),
    languageNote:
      '«Inglés / español»: interfaz en español, preguntas en inglés y explicaciones en español. «Todo en inglés»: también las explicaciones en inglés; las que aún no tienen versión en inglés aparecen como pendientes. Se aplica a las dos certificaciones.',
    exam: 'Simulacro',
    excludeDoubtful: (n: number) => `Excluir las preguntas dudosas u obsoletas (${n})`,
    officialOnly: (n: number) => `Usar solo preguntas de fuentes oficiales (${n})`,
    pool: (n: number) => `Con estos ajustes el simulacro elige entre ${plural(n, 'pregunta', 'preguntas')}.`,
    tooShort: (questionCount: number) => ` No llegan a ${questionCount}: el simulacro será más corto.`,
    progress: 'Tu progreso',
    progressText: 'Se guarda solo en este navegador. Exporta una copia de vez en cuando, o antes de cambiar de navegador o de borrar sus datos.',
    export: 'Exportar progreso (JSON)',
    import: 'Importar progreso…',
    reset: 'Borrar todo el progreso',
    importFailed: (reason: string) => `No se ha podido importar: ${reason}`,
    fileName: (slug: string, date: string) => `progreso-${slug}-${date}.json`,
    bank: 'Banco de preguntas',
    bankCount: (n: number, sources: string[]) => `${n} preguntas · ${sources.join(' · ')}`,
    bankInfo: (hash: string, rules: ExamConfig, needed: number, guide: string, sourcesNote: string) =>
      `Versión ${hash}. Examen: ${rules.questionCount} preguntas (${rules.scoredCount} puntúan), ${rules.durationMinutes} minutos y aprobado con el ${rules.passPercent} % (${needed} de ${rules.scoredCount}; ${guide}). ${sourcesNote}`,
    importTitle: '¿Reemplazar tu progreso?',
    importConfirm: 'Reemplazar',
    importBody: (answered: number, exams: number) =>
      `El archivo tiene ${plural(answered, 'pregunta respondida', 'preguntas respondidas')} y ${plural(exams, 'simulacro', 'simulacros')}. Sustituirá a tu progreso actual.`,
    resetTitle: '¿Borrar todo el progreso?',
    resetConfirm: 'Borrar',
    resetBody: 'Se borrarán tus estadísticas, las marcas, el historial y el simulacro en curso. No se puede deshacer.',
  },

  preparing: {
    text: 'El banco de preguntas de esta certificación todavía está en preparación, así que aún no se puede practicar.',
    exam: (rules: ExamConfig, needed: number, sections: string[]) =>
      `El examen tendrá ${rules.questionCount} preguntas (${rules.scoredCount} puntúan), ${rules.durationMinutes} minutos y se aprueba con el ${rules.passPercent} % (${needed} de ${rules.scoredCount}), repartidas en ${sections.length} secciones: ${sections.join(', ')}.`,
    independent: 'Sus preguntas y su progreso son independientes de los de las demás certificaciones.',
  },
}

export type Messages = typeof es

const en: Messages = {
  locale: 'en-US',
  pct: (n) => `${n}%`,
  ofN: (a, b) => `${a} of ${b}`,
  cancel: 'Cancel',
  close: 'Close',
  all: 'All',
  none: 'None',
  previous: '← Previous',
  next: 'Next →',
  backHome: 'Back to home',
  noData: 'no data',
  passed: '✓ Passed',
  failed: '✗ Failed',

  app: {
    brandSub: 'simulator',
    docTitle: (cert) => `${cert} · Simulator`,
    navLabel: 'Main',
    nav: { home: 'Home', history: 'History', settings: 'Settings' },
    certSwitchLabel: 'Certification',
  },

  notice: (n, sectionName) => {
    switch (n.kind) {
      case 'backup':
        return `The saved data was damaged or from another version. A copy was kept in localStorage («${n.key}») and you are starting from scratch.`
      case 'expired':
        return 'The mock exam ran out of time while you were away, so it has been submitted.'
      case 'bank-changed':
        return 'The question bank has changed since you started the mock exam, so it cannot be resumed.'
      case 'imported':
        return 'Progress imported.'
      case 'reset':
        return 'Progress deleted.'
      case 'short-exam':
        return `With your settings only ${n.available} questions are available, so the mock exam is shorter than the real one.`
      case 'shortfall':
        return `There are not enough ${n.sections.map(sectionName).join(', ')} questions, so that gap was filled with other sections.`
    }
  },

  runTitle: { practice: 'Practice', review: 'Review', failed: 'Failed questions', 'exam-failed': 'Failed in the mock exam' },

  home: {
    resumeLabel: 'Mock exam in progress',
    resumeTitle: 'You have a mock exam in progress',
    resumeText: (time, answered, total) =>
      `${time} left · ${plural(answered, 'question answered', 'questions answered')} of ${total}. The clock keeps running even if you close the page.`,
    discard: 'Discard',
    resume: 'Resume',
    practiceTitle: 'Practice',
    practiceText: 'Check each answer right away and read the explanation. You can filter by section and by source.',
    practiceButton: 'Practice',
    examTitle: 'Mock exam',
    examText: (rules, needed) =>
      `${rules.questionCount} questions spread like the real exam (${rules.scoredCount} are scored and ${rules.questionCount - rules.scoredCount} are unscored reserves, revealed when you submit), ${rules.durationMinutes} minutes and a pass mark of ${rules.passPercent}% (${needed} of ${rules.scoredCount}). You see the grading when you submit.`,
    examButton: 'Start mock exam',
    examBlocked: 'You already have one in progress',
    reviewTitle: 'Review',
    reviewText: (n) =>
      n
        ? `${plural(n, 'question to review', 'questions to review')}: the ones you got wrong and the ones you flagged. They leave after two correct answers in a row.`
        : 'Questions you get wrong or flag will show up here until you answer them correctly twice in a row.',
    reviewButton: 'Review',
    progressLabel: 'Your progress',
    seen: 'Questions seen',
    globalHit: 'Overall accuracy',
    answers: (n) => plural(n, 'answer', 'answers'),
    inReview: 'In review',
    lastExam: 'Last mock exam',
    lastPassed: '✓ passed',
    lastFailed: '✗ failed',
    discardTitle: 'Discard the mock exam?',
    discardBody: 'Your answers will be lost and it will not count in the history.',
  },

  practice: {
    title: 'Practice',
    intro: 'Answer, check and read the explanation right away. Every answer counts towards your statistics.',
    sections: 'Sections',
    sources: 'Sources',
    officialOnly: (n, names) => `Official only (${n}: ${names})`,
    unseenOnly: 'Only questions you have not seen yet',
    count: 'Number of questions',
    exactCount: 'Exact number of questions',
    exactRange: (max) => `Between 1 and ${max}`,
    fewer: 'Remove a question',
    more: 'Add a question',
    noneFound: 'No questions match these filters',
    start: (n) => `Start with ${plural(n, 'question', 'questions')}`,
    summary: (title) => `Summary · ${title}`,
    hit: 'Accuracy',
    hits: 'Correct',
    unanswered: 'Unanswered',
    repeatFailed: (n) => `Retry the ${plural(n, 'failed question', 'failed questions')}`,
    progress: (checked, total, correct) => `${checked} of ${total} answered · ${plural(correct, 'correct', 'correct')}`,
    finish: 'Finish',
    srRight: 'Correct',
    srWrong: 'Incorrect',
    right: '✓ Correct!',
    wrong: '✗ Incorrect',
    check: 'Check',
    pickToCheck: (n) => `Pick ${n} to check`,
    summaryButton: 'See summary',
    hint: 'Shortcuts: 1-5 select options · Enter checks and moves on · ← previous · M flags for review',
  },

  exam: {
    panelLabel: 'Mock exam status',
    timerLabel: 'Time left',
    timerWarning: '⚠ Less than 5 minutes left',
    counts: (answered, total, flagged) => `${answered} of ${total} answered · ${flagged} flagged`,
    submitExam: 'Submit mock exam',
    submit: 'Submit',
    hint: 'Shortcuts: 1-5 select options · Enter or → next · ← previous · M flags for review',
    confirmTitle: 'Submit the mock exam?',
    keepGoing: 'Keep going',
    pending: (n) => `${n} ${n === 1 ? 'question is' : 'questions are'} still unanswered; they will count as wrong.`,
    allAnswered: 'You have answered every question.',
    flagged: (n) => `You have ${plural(n, 'flagged question', 'flagged questions')} to review.`,
    rules: (rules, needed) =>
      `You need ${rules.passPercent}% to pass (${needed} of ${rules.scoredCount} scored; ${rules.questionCount - rules.scoredCount} of the ${rules.questionCount} are unscored reserves and you will not know which until you submit). Once submitted you will see the grading and cannot change your answers.`,
    paletteLabel: 'Mock exam questions',
    paletteItem: (n, answered, flagged) => `Question ${n}: ${answered ? 'answered' : 'unanswered'}${flagged ? ', flagged' : ''}`,
    legendAnswered: 'answered',
    legendFlagged: 'flagged',
    legendCurrent: 'current',
  },

  card: {
    number: (n, total) => `Question ${n} of ${total}`,
    flagOn: () => '★ Flagged for review',
    flagOff: () => '☆ Flag for review',
    chooseN: (max, selected) => `Choose ${max} · ${selected} of ${max} selected`,
    options: 'Options',
    verdictRight: '✓ Correct',
    verdictMissed: '✓ Correct, you did not select it',
    verdictWrong: '✗ Your answer',
    explanation: 'Explanation',
    review: { corrected: 'Corrected key', disputed: 'Doubtful answer', outdated: 'Outdated question' },
    sourceGave: (text) => ` The source gave «${text}» as correct.`,
    authored: 'The source only had the question and its answer, so the incorrect options were written separately to make it practicable.',
    pending: 'No English explanation is available for this question yet.',
    learnMore: 'Learn more',
  },

  results: {
    srTitle: 'Mock exam result',
    yourScore: 'Your score',
    passMark: (cert, passPercent, needed, total) => `${cert}: the pass mark is ${passPercent}%, ${needed} of ${total} questions.`,
    reserveNote: (n) => ` ${plural(n, 'question was an unscored reserve', 'questions were unscored reserves')}.`,
    hits: 'Correct',
    unanswered: 'Unanswered',
    unansweredDetail: 'count as wrong',
    flagged: 'Flagged',
    flaggedDetail: 'go to Review',
    timeUsed: 'Time used',
    timeOf: (total) => `of ${total}`,
    barsTitle: 'Accuracy by section',
    reviewTitle: 'Answer review',
    filterLabel: 'Which questions to show',
    filterFailed: (n) => `Wrong (${n})`,
    filterFlagged: (n) => `Flagged (${n})`,
    filterAll: (n) => `All (${n})`,
    emptyFilter: 'No questions match this filter.',
    right: '✓ Correct',
    wrong: '✗ Wrong',
    skipped: '– Unanswered',
    reserveTag: ' · unscored',
    practiceFailed: (n) => `Practice the ${plural(n, 'failed question', 'failed questions')}`,
  },

  history: {
    title: 'History',
    exams: 'Mock exams',
    passed: 'Passed',
    best: 'Best score',
    recent: 'Recent average',
    lastN: (n) => `last ${n}`,
    barsTitle: 'Overall accuracy by section',
    barsCaption: 'All your answers in practice, review and mock exams.',
    none: 'You have not taken any mock exam yet.',
    date: 'Date',
    score: 'Score',
    hits: 'Correct',
    time: 'Time',
    result: 'Result',
  },

  bars: {
    unit: { questions: 'questions', answers: 'answers' },
    passLine: (caption, passPercent) => `${caption ? `${caption} ` : ''}The vertical line marks the pass mark (${passPercent}%).`,
    asChart: 'Show chart',
    asTable: 'Show as table',
    section: 'Section',
    hits: 'Correct',
    totalOf: (unit) => `Total ${unit}`,
    hit: 'Accuracy',
    below: ' · below the pass mark',
    rowLabel: (label, value, correct, total, unit, below) =>
      `${label}: ${value}, ${correct} of ${total} ${unit}${below ? ', below the pass mark' : ''}`,
    legend: '⚠ Section below the pass mark.',
  },

  settings: {
    title: (cert) => `Settings · ${cert}`,
    language: 'Language',
    languageName: (lang) => (lang === 'es' ? 'English / Spanish' : 'All in English'),
    languageNote:
      '«English / Spanish»: Spanish interface, questions in English and explanations in Spanish. «All in English»: explanations in English too; questions without an English explanation show as pending. Applies to both certifications.',
    exam: 'Mock exam',
    excludeDoubtful: (n) => `Exclude doubtful or outdated questions (${n})`,
    officialOnly: (n) => `Use only questions from official sources (${n})`,
    pool: (n) => `With these settings the mock exam picks from ${plural(n, 'question', 'questions')}.`,
    tooShort: (questionCount) => ` That is fewer than ${questionCount}, so the mock exam will be shorter.`,
    progress: 'Your progress',
    progressText: 'It is stored only in this browser. Export a copy now and then, or before switching browsers or clearing its data.',
    export: 'Export progress (JSON)',
    import: 'Import progress…',
    reset: 'Delete all progress',
    importFailed: () => 'Could not import: this is not a valid progress file for this certification.',
    fileName: (slug, date) => `progress-${slug}-${date}.json`,
    bank: 'Question bank',
    bankCount: (n, sources) => `${n} questions · ${sources.join(' · ')}`,
    bankInfo: (hash, rules, needed, guide, sourcesNote) =>
      `Version ${hash}. Exam: ${rules.questionCount} questions (${rules.scoredCount} scored), ${rules.durationMinutes} minutes and a pass mark of ${rules.passPercent}% (${needed} of ${rules.scoredCount}; ${guide}). ${sourcesNote}`,
    importTitle: 'Replace your progress?',
    importConfirm: 'Replace',
    importBody: (answered, exams) =>
      `The file has ${plural(answered, 'answered question', 'answered questions')} and ${plural(exams, 'mock exam', 'mock exams')}. It will replace your current progress.`,
    resetTitle: 'Delete all progress?',
    resetConfirm: 'Delete',
    resetBody: 'Your statistics, flags, history and the mock exam in progress will be deleted. This cannot be undone.',
  },

  preparing: {
    text: 'The question bank for this certification is still being prepared, so it cannot be practised yet.',
    exam: (rules, needed, sections) =>
      `The exam will have ${rules.questionCount} questions (${rules.scoredCount} scored), ${rules.durationMinutes} minutes and a pass mark of ${rules.passPercent}% (${needed} of ${rules.scoredCount}), spread over ${sections.length} sections: ${sections.join(', ')}.`,
    independent: 'Its questions and its progress are independent from those of the other certifications.',
  },
}

export const MESSAGES: Record<Lang, Messages> = { es, en }

/** Nombre de una sección en el idioma activo. */
export const sectionText = (section: Pick<Section, 'label' | 'labelEn'>, lang: Lang): string => (lang === 'en' ? section.labelEn : section.label)

export function sectionName(cert: CertConfig, key: SectionKey, lang: Lang): string {
  const section = cert.sections.find((s) => s.key === key)
  return section ? sectionText(section, lang) : key
}

/** Etiqueta de la fuente de una pregunta, en el idioma activo. */
export const sourceLabel = (source: SourceId, lang: Lang): string => (lang === 'en' ? SOURCE_LABELS_EN[source] : SOURCE_LABELS[source])

/** Textos de la certificación que cambian con el idioma. */
export interface CertTexts {
  officialNames: string
  footer: string
  guide: string
  sourcesNote: string
  officialNote: string
}

export function certTexts(cert: CertConfig, lang: Lang): CertTexts {
  if (lang === 'es') return cert
  return CERT_TEXTS_EN[cert.id]
}

const CERT_TEXTS_EN: Record<CertConfig['id'], CertTexts> = {
  admin: {
    officialNames: 'CRT101, ADX201 and Trailhead',
    footer:
      'Personal use. Questions from the official CRT101 and ADX201 Trailhead Academy courses and the Trailhead prep module, and from the unofficial FreeCram, Success4Exam and Debrief sources (with reviewed keys). Your progress is stored only in this browser.',
    guide: 'official exam guide, CRT101',
    sourcesNote:
      'The FreeCram, Success4Exam and Debrief questions are unofficial, and some keys have been corrected or flagged as doubtful. In the Debrief and the Trailhead cards the source only gives the answer: the incorrect options were written separately.',
    officialNote: 'The official sources have no Agentforce questions.',
  },
  appbuilder: {
    officialNames: '',
    footer: 'Personal use. Questions from FreeCram and the Success4Exam demo, which are unofficial. Your progress is stored only in this browser.',
    guide: "official Platform App Builder exam guide, SU '26",
    sourcesNote:
      'These are unofficial questions from FreeCram and the Success4Exam demo. Questions repeated across sources have been merged, and corrected or doubtful keys are flagged on each question.',
    officialNote: '',
  },
}

const SOURCE_LABELS_EN: Record<SourceId, string> = {
  crt101: 'Official · CRT101',
  adx201: 'Official · ADX201',
  trailhead: 'Official · Trailhead',
  freecram: 'FreeCram (unofficial)',
  success4exam: 'Success4Exam (unofficial)',
  debrief: 'Debrief (unofficial)',
  abv2335: 'FreeCram V23.35 (unofficial)',
  abs4e: 'Success4Exam demo (unofficial)',
  abfc143: 'FreeCram v2026-06-30 (unofficial)',
  abfc108: 'FreeCram v2026-09-05 (unofficial)',
  abfc35: 'FreeCram undated (unofficial)',
}
