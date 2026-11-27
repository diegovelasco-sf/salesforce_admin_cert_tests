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
import type { Theme } from './theme.ts'

export type Lang = 'es' | 'en'

/** Quita el punto final de una opción citada entre comillas, para no acabar en «….». */
const trimDot = (text: string): string => text.replace(/\.$/, '')

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
    nav: { home: 'Inicio', browse: 'Banco', history: 'Progreso', settings: 'Ajustes' },
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
      case 'study-synced':
        return es.study.synced(n.added, n.removed)
    }
  },

  runTitle: { practice: 'Práctica', review: 'Repaso', failed: 'Falladas', 'exam-failed': 'Falladas del simulacro', study: 'Estudio' } satisfies Record<
    RunKind,
    string
  >,

  packNav: {
    label: 'Navegación del paquete',
    back: '← Volver a los grupos de paquetes',
    group: (name: string) => `Grupo: ${name}`,
    repeatAll: (n: number) => `↻ Empezar de nuevo el paquete (${n})`,
    packs: 'Paquetes del grupo:',
    item: (n: number, mastered: number, total: number, current: boolean) =>
      `Paquete ${n}${current ? ' (el actual)' : ''}: ${mastered} de ${total} dominadas`,
    leaveTitle: '¿Dejar esta tanda?',
    leaveBody: 'Las respuestas que ya has comprobado se quedan guardadas; solo se pierde la posición en esta tanda.',
    leaveConfirm: 'Sí, cambiar',
  },

  tracker: {
    label: 'Progreso de la tanda',
    progress: (answered: number, total: number) => `${answered} de ${total} respondidas`,
    right: (n: number) => `✓ ${n}`,
    wrong: (n: number) => `✗ ${n}`,
    hide: 'Ocultar preguntas',
    show: 'Ver preguntas',
    hideScore: 'Ocultar acierto',
    showScore: 'Ver acierto',
    hitLabel: 'Acierto',
    hitMeter: (value: string, pass: number) => `Acierto ${value}; el aprobado está en el ${pass} %`,
    hitDetail: (right: number, answered: number, pass: number) => `${right} de ${answered} respondidas · aprobado ${pass} %`,
    hitEmpty: 'Responde una pregunta para ver tu acierto',
    hitBelow: ' · ⚠ por debajo del aprobado',
    gridLabel: 'Preguntas de la tanda',
    item: (n: number, state: 'right' | 'wrong' | 'pending'): string =>
      `Pregunta ${n}: ${{ right: 'acertada', wrong: 'fallada', pending: 'sin responder' }[state]}`,
    legendRight: 'acertada',
    legendWrong: 'fallada',
    legendPending: 'sin responder',
    legendCurrent: 'actual',
  },

  sources: {
    officialOnly: 'Solo oficiales',
    total: (n: number) => `${plural(n, 'pregunta', 'preguntas')} con estas fuentes`,
  },

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
    reviewEmptySources: 'Con las fuentes elegidas no tienes preguntas en repaso.',
    studyTitle: 'Estudio',
    studyText: (plans: number, packs: number) =>
      plans
        ? `${plural(plans, 'grupo', 'grupos')} con ${plural(packs, 'paquete fijo', 'paquetes fijos')}. Repítelos enteros, solo las falladas o solo las marcadas hasta dominarlos.`
        : 'Reparte en paquetes fijos de 30 o 60 preguntas las secciones y fuentes que elijas, para repetirlos hasta memorizarlos.',
    studyButton: (hasPlan: boolean): string => (hasPlan ? 'Estudiar' : 'Crear paquetes'),
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
    filters: 'Filtros',
    unseenOnly: 'Solo preguntas que aún no has visto',
    excludeDoubtful: (n: number) => `Sin preguntas dudosas ni obsoletas (${n} en el banco)`,
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
    finish: 'Terminar',
    srRight: 'Correcto',
    srWrong: 'Incorrecto',
    right: '✓ ¡Correcto!',
    wrong: '✗ Incorrecto',
    check: 'Comprobar',
    pickToCheck: (n: number) => `Elige ${n} para comprobar`,
    summaryButton: 'Ver resumen',
    hint: 'Atajos: 1-5 marcan opciones · Enter comprueba y avanza · ← anterior · → siguiente · M marca para repasar · N escribe una nota',
    nextPack: 'Siguiente paquete',
    backToStudy: 'Volver a los paquetes',
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
    alsoIn: (refs: string) => `También en: ${refs}`,
    conflictTitle: (source: string) => `${source} da otra respuesta.`,
    conflictGave: (theirs: string, ours: string) => `Esa fuente da por correcta «${trimDot(theirs)}»; aquí se mantiene «${trimDot(ours)}».`,
    note: 'Tu nota',
    noteAdd: '✎ Añadir nota',
    noteEdit: '✎ Editar nota',
    notePlaceholder: 'Un truco para recordarla, un enlace a la documentación…',
    noteSave: 'Guardar',
    noteDelete: 'Borrar nota',
  },

  study: {
    title: 'Estudio',
    intro:
      'Crea grupos de paquetes con las secciones y las fuentes que quieras, por ejemplo solo Success4Exam con Fundamentos y Modelado de datos. Cada grupo reparte sus preguntas en paquetes fijos que no se solapan, todos con la misma mezcla de secciones. Puedes tener varios grupos a la vez, cada uno con su propio dominio. Una pregunta está dominada si nunca la has fallado en ese grupo o si, tras fallarla, la aciertas dos veces seguidas.',
    newGroup: '+ Nuevo grupo de paquetes',
    setupTitle: 'Nuevo grupo de paquetes',
    size: 'Tamaño de cada paquete',
    sizeOption: (n: number) => `${n} preguntas`,
    sources: 'Fuentes',
    sectionsLegend: 'Secciones',
    excludeDoubtful: (n: number) => `Sin preguntas dudosas ni obsoletas (${n} en el banco)`,
    preview: (questions: number, packs: number) =>
      questions
        ? `${plural(questions, 'pregunta', 'preguntas')} en ${plural(packs, 'paquete', 'paquetes')}.`
        : 'No hay preguntas con estas secciones y fuentes.',
    create: 'Crear el grupo',
    planSources: (sources: string) => `Fuentes: ${sources}`,
    planInfo: (questions: number, packs: number, size: number) =>
      `${plural(questions, 'pregunta', 'preguntas')} en ${plural(packs, 'paquete', 'paquetes')} de unas ${size}`,
    groupLabel: (sections: string, sources: string) => `Grupo de paquetes: ${sections}; fuentes: ${sources}`,
    remove: 'Borrar este grupo',
    removeTitle: '¿Borrar este grupo de paquetes?',
    removeBody: (sections: string, sources: string) =>
      `Se borrará el grupo «${sections}» (fuentes: ${sources}) y el dominio de sus paquetes. Tus estadísticas generales, las marcas, las notas y los demás grupos no cambian.`,
    removeConfirm: 'Borrar',
    allSources: 'todas',
    allSections: 'Todas las secciones',
    sectionsNote: 'Cada paquete solo llevará preguntas de las secciones elegidas, en la proporción que tienen en el banco.',
    synced: (added: number, removed: number) =>
      `El banco ha cambiado: ${[added ? plural(added, 'pregunta nueva', 'preguntas nuevas') + ' en los últimos paquetes' : '', removed ? plural(removed, 'pregunta retirada', 'preguntas retiradas') : ''].filter(Boolean).join(' y ')}. El resto sigue en su paquete.`,
    pack: (n: number) => `Paquete ${n}`,
    packMeter: (mastered: number, total: number) => `${mastered} de ${total} dominadas`,
    packCounts: (fresh: number, learning: number) => `${fresh} sin ver · ${plural(learning, 'fallada', 'falladas')} por dominar`,
    packDone: '✓ Dominado',
    flaggedCount: (n: number) => plural(n, 'marcada', 'marcadas'),
    repeatAll: (n: number) => `Todas (${n})`,
    repeatFailed: (n: number) => `Falladas (${n})`,
    repeatFlagged: (n: number) => `Marcadas (${n})`,
    sections: (parts: string) => `Secciones: ${parts}`,
    totalMastered: (mastered: number, total: number) => `${mastered} de ${total} preguntas dominadas`,
  },

  browse: {
    title: 'Banco de preguntas',
    intro: 'Busca y consulta cualquier pregunta con su respuesta y su explicación. Desde aquí también puedes marcarla o escribirle una nota.',
    search: 'Buscar',
    searchPlaceholder: 'Texto del enunciado o de las opciones, o id (ab-v2335-012)',
    section: 'Sección',
    allSections: 'Todas las secciones',
    source: 'Fuente',
    allSources: 'Todas las fuentes',
    status: 'Estado',
    statusAll: 'Todas',
    statusFlagged: 'Marcadas',
    statusFailed: 'En repaso',
    statusNoted: 'Con nota',
    statusUnseen: 'Sin ver',
    statusDoubtful: 'Dudosas u obsoletas',
    results: (n: number, total: number) => `${plural(n, 'pregunta', 'preguntas')} de ${total}`,
    showMore: (n: number) => `Ver ${n} más`,
    empty: 'Ninguna pregunta coincide con la búsqueda.',
    practiceThese: (n: number) => (n === 1 ? 'Practicar esta pregunta' : `Practicar estas ${n} preguntas`),
    seenStat: (seen: number, correct: number) => (seen ? `Vista ${seen} ${seen === 1 ? 'vez' : 'veces'} · ${correct} ${correct === 1 ? 'acierto' : 'aciertos'}` : 'Sin ver'),
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
    title: 'Progreso',
    exams: 'Simulacros',
    overview: 'Resumen',
    seen: 'Preguntas vistas',
    mastered: 'Dominadas',
    masteredDetail: 'acertadas y sin fallos pendientes',
    inReview: 'En repaso',
    studyPacks: 'Paquetes dominados',
    trendTitle: 'Nota de los simulacros',
    trendCaption: (passPercent: number) => `Cada punto es un simulacro, del más antiguo al más reciente. La línea discontinua marca el aprobado (${passPercent} %).`,
    trendPoint: (n: number, date: string, score: string, passed: boolean) => `Simulacro ${n}, ${date}: ${score}, ${passed ? 'aprobado' : 'suspendido'}`,
    weakTitle: 'Dónde flojeas',
    weakText: 'Secciones con menos acierto acumulado. Practícalas para subir la media.',
    weakEmpty: 'Responde algunas preguntas para ver qué secciones te cuestan más.',
    practiceSection: 'Practicar',
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
      '«Inglés / español»: interfaz en español, preguntas en inglés y explicaciones en español. «Todo en inglés»: también las explicaciones en inglés; las que aún no tienen versión en inglés aparecen como pendientes. Se aplica a todas las certificaciones.',
    theme: 'Tema',
    themeName: (theme: Theme): string => ({ auto: 'Automático (el del sistema)', light: 'Claro', dark: 'Oscuro' })[theme],
    exam: 'Simulacro',
    excludeDoubtful: (n: number) => `Excluir las preguntas dudosas u obsoletas (${n})`,
    examSources: 'Fuentes del simulacro',
    reviewSources: 'Fuentes del repaso',
    reviewSourcesNote: 'Repaso solo incluye las preguntas falladas o marcadas de estas fuentes.',
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
    provisional:
      'Aviso: este formato (número de preguntas, duración, nota de corte y secciones) es provisional y todavía no se ha confirmado con la guía oficial del examen.',
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
    nav: { home: 'Home', browse: 'Bank', history: 'Progress', settings: 'Settings' },
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
      case 'study-synced':
        return en.study.synced(n.added, n.removed)
    }
  },

  runTitle: { practice: 'Practice', review: 'Review', failed: 'Failed questions', 'exam-failed': 'Failed in the mock exam', study: 'Study' },

  packNav: {
    label: 'Pack navigation',
    back: '← Back to the pack groups',
    group: (name) => `Group: ${name}`,
    repeatAll: (n) => `↻ Restart the pack (${n})`,
    packs: 'Packs in this group:',
    item: (n, mastered, total, current) => `Pack ${n}${current ? ' (current)' : ''}: ${mastered} of ${total} mastered`,
    leaveTitle: 'Leave this run?',
    leaveBody: 'The answers you have already checked stay saved; only your place in this run is lost.',
    leaveConfirm: 'Yes, switch',
  },

  tracker: {
    label: 'Run progress',
    progress: (answered, total) => `${answered} of ${total} answered`,
    right: (n) => `✓ ${n}`,
    wrong: (n) => `✗ ${n}`,
    hide: 'Hide questions',
    show: 'Show questions',
    hideScore: 'Hide score',
    showScore: 'Show score',
    hitLabel: 'Score',
    hitMeter: (value, pass) => `Score ${value}; the pass mark is ${pass}%`,
    hitDetail: (right, answered, pass) => `${right} of ${answered} answered · pass mark ${pass}%`,
    hitEmpty: 'Answer a question to see your score',
    hitBelow: ' · ⚠ below the pass mark',
    gridLabel: 'Questions in this run',
    item: (n, state) => `Question ${n}: ${{ right: 'correct', wrong: 'wrong', pending: 'not answered' }[state]}`,
    legendRight: 'correct',
    legendWrong: 'wrong',
    legendPending: 'not answered',
    legendCurrent: 'current',
  },

  sources: {
    officialOnly: 'Official only',
    total: (n) => `${plural(n, 'question', 'questions')} with these sources`,
  },

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
    reviewEmptySources: 'With the chosen sources you have no questions in review.',
    studyTitle: 'Study',
    studyText: (plans, packs) =>
      plans
        ? `${plural(plans, 'group', 'groups')} with ${plural(packs, 'fixed pack', 'fixed packs')}. Repeat them in full, only the failed ones or only the flagged ones until you master them.`
        : 'Split the sections and sources you choose into fixed packs of 30 or 60 questions, to repeat them until you memorize them.',
    studyButton: (hasPlan) => (hasPlan ? 'Study' : 'Create packs'),
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
    filters: 'Filters',
    unseenOnly: 'Only questions you have not seen yet',
    excludeDoubtful: (n) => `No doubtful or outdated questions (${n} in the bank)`,
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
    finish: 'Finish',
    srRight: 'Correct',
    srWrong: 'Incorrect',
    right: '✓ Correct!',
    wrong: '✗ Incorrect',
    check: 'Check',
    pickToCheck: (n) => `Pick ${n} to check`,
    summaryButton: 'See summary',
    hint: 'Shortcuts: 1-5 select options · Enter checks and moves on · ← previous · → next · M flags for review · N writes a note',
    nextPack: 'Next pack',
    backToStudy: 'Back to the packs',
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
    alsoIn: (refs) => `Also in: ${refs}`,
    conflictTitle: (source) => `${source} gives a different answer.`,
    conflictGave: (theirs, ours) => `That source marks «${trimDot(theirs)}» as correct; this bank keeps «${trimDot(ours)}».`,
    note: 'Your note',
    noteAdd: '✎ Add note',
    noteEdit: '✎ Edit note',
    notePlaceholder: 'A trick to remember it, a link to the docs…',
    noteSave: 'Save',
    noteDelete: 'Delete note',
  },

  study: {
    title: 'Study',
    intro:
      'Create pack groups with the sections and sources you want, for example only Success4Exam with Fundamentals and Data Modeling. Each group splits its questions into fixed packs that do not overlap, all with the same section mix. You can have several groups at once, each with its own mastery. A question is mastered if you have never failed it in that group or if, after failing it, you get it right twice in a row.',
    newGroup: '+ New pack group',
    setupTitle: 'New pack group',
    size: 'Size of each pack',
    sizeOption: (n) => `${n} questions`,
    sources: 'Sources',
    sectionsLegend: 'Sections',
    excludeDoubtful: (n) => `No doubtful or outdated questions (${n} in the bank)`,
    preview: (questions, packs) =>
      questions ? `${plural(questions, 'question', 'questions')} in ${plural(packs, 'pack', 'packs')}.` : 'There are no questions with these sections and sources.',
    create: 'Create the group',
    planSources: (sources) => `Sources: ${sources}`,
    planInfo: (questions, packs, size) => `${plural(questions, 'question', 'questions')} in ${plural(packs, 'pack', 'packs')} of about ${size}`,
    groupLabel: (sections, sources) => `Pack group: ${sections}; sources: ${sources}`,
    remove: 'Delete this group',
    removeTitle: 'Delete this pack group?',
    removeBody: (sections, sources) =>
      `The group «${sections}» (sources: ${sources}) and the mastery of its packs will be deleted. Your overall stats, flags, notes and other groups do not change.`,
    removeConfirm: 'Delete',
    allSources: 'all',
    allSections: 'All sections',
    sectionsNote: 'Each pack will only have questions from the chosen sections, in the proportion they have in the bank.',
    synced: (added, removed) =>
      `The bank has changed: ${[added ? plural(added, 'new question', 'new questions') + ' in the last packs' : '', removed ? plural(removed, 'question removed', 'questions removed') : ''].filter(Boolean).join(' and ')}. The rest stay in their pack.`,
    pack: (n) => `Pack ${n}`,
    packMeter: (mastered, total) => `${mastered} of ${total} mastered`,
    packCounts: (fresh, learning) => `${fresh} not seen · ${plural(learning, 'failed', 'failed')} to master`,
    packDone: '✓ Mastered',
    flaggedCount: (n) => `${n} flagged`,
    repeatAll: (n) => `All (${n})`,
    repeatFailed: (n) => `Failed (${n})`,
    repeatFlagged: (n) => `Flagged (${n})`,
    sections: (parts) => `Sections: ${parts}`,
    totalMastered: (mastered, total) => `${mastered} of ${total} questions mastered`,
  },

  browse: {
    title: 'Question bank',
    intro: 'Search and read any question with its answer and explanation. You can also flag it or write a note from here.',
    search: 'Search',
    searchPlaceholder: 'Text of the question or options, or id (ab-v2335-012)',
    section: 'Section',
    allSections: 'All sections',
    source: 'Source',
    allSources: 'All sources',
    status: 'Status',
    statusAll: 'All',
    statusFlagged: 'Flagged',
    statusFailed: 'In review',
    statusNoted: 'With a note',
    statusUnseen: 'Not seen',
    statusDoubtful: 'Doubtful or outdated',
    results: (n, total) => `${plural(n, 'question', 'questions')} of ${total}`,
    showMore: (n) => `Show ${n} more`,
    empty: 'No question matches the search.',
    practiceThese: (n) => (n === 1 ? 'Practice this question' : `Practice these ${n} questions`),
    seenStat: (seen, correct) => (seen ? `Seen ${seen} ${seen === 1 ? 'time' : 'times'} · ${correct} correct` : 'Not seen'),
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
    title: 'Progress',
    exams: 'Mock exams',
    overview: 'Overview',
    seen: 'Questions seen',
    mastered: 'Mastered',
    masteredDetail: 'answered right, no pending misses',
    inReview: 'In review',
    studyPacks: 'Packs mastered',
    trendTitle: 'Mock exam scores',
    trendCaption: (passPercent) => `Each point is a mock exam, from oldest to newest. The dashed line marks the pass mark (${passPercent}%).`,
    trendPoint: (n, date, score, passed) => `Mock exam ${n}, ${date}: ${score}, ${passed ? 'passed' : 'failed'}`,
    weakTitle: 'Where you struggle',
    weakText: 'Sections with the lowest overall hit rate. Practice them to raise your average.',
    weakEmpty: 'Answer some questions to see which sections are hardest for you.',
    practiceSection: 'Practice',
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
      '«English / Spanish»: Spanish interface, questions in English and explanations in Spanish. «All in English»: explanations in English too; questions without an English explanation show as pending. Applies to all certifications.',
    theme: 'Theme',
    themeName: (theme) => ({ auto: 'Automatic (system)', light: 'Light', dark: 'Dark' })[theme],
    exam: 'Mock exam',
    excludeDoubtful: (n) => `Exclude doubtful or outdated questions (${n})`,
    examSources: 'Mock exam sources',
    reviewSources: 'Review sources',
    reviewSourcesNote: 'Review only includes failed or flagged questions from these sources.',
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
    provisional:
      'Note: this format (number of questions, duration, pass mark and sections) is provisional and has not been confirmed against the official exam guide yet.',
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
    footer: 'Personal use. Unofficial questions from FreeCram and Success4Exam. Your progress is stored only in this browser.',
    guide: "official Platform App Builder exam guide, SU '26",
    sourcesNote:
      'These are unofficial FreeCram and Success4Exam questions: the base is FreeCram V23.35, in a revised version with typos and keys corrected, with later versions added. The Success4Exam 2026 Practice Test almost only repeats V23.35 questions: it has been merged with them, and the ones with a different key are under review. The bank predates SU \'26, so questions that depend on retired features (Process Builder, Workflow Rules) are flagged as outdated and excluded from the mock exam. Questions repeated across sources have been merged, and corrected or doubtful keys are flagged on each question.',
    officialNote: '',
  },
  developer: {
    officialNames: '',
    footer: 'Personal use. Your progress is stored only in this browser.',
    guide: 'official Platform Developer I exam guide (to be confirmed)',
    sourcesNote: 'There are no questions yet: the bank is being prepared.',
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
  abv2335: 'FreeCram V23.35 revised (unofficial)',
  abs4e: 'Success4Exam 2026 (unofficial)',
  abfc143: 'FreeCram v2026-06-30 (unofficial)',
  abfc108: 'FreeCram v2026-09-05 (unofficial)',
  abfc35: 'FreeCram undated (unofficial)',
}
