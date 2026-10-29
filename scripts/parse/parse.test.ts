import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ParsedQuestion } from '../../src/domain/types.ts'
import { SOURCES, parsedPath, rawPath, readJson, type RawLine, type RawPage } from '../paths.ts'
import { parseFreecram } from './freecram.ts'
import { parseFreecram2, tidy } from './freecram2.ts'
import { manualQuestions } from './manual.ts'
import { assertClean, joinLines, normalizeText, visualLines } from './normalize.ts'
import { parsers } from './parsers.ts'
import { parseSuccess4exam } from './success4exam.ts'
import { parseTrailhead, readScenarios } from './trailhead.ts'

const line = (text: string, y: number, x = 72): RawLine => ({ text, x, y })

describe('normalize', () => {
  it('deshace ligaduras, incluida la de "ft" que PDFKit deja como carácter privado', () => {
    expect(normalizeText('a\uE1BFer di\uFB00erent')).toBe('after different')
  })

  it('une líneas con espacio, salvo tras un guion', () => {
    expect(joinLines(['high-', 'quality  data', '', 'here'])).toBe('high-quality data here')
  })

  it('detecta caracteres que delatan una mala extracción', () => {
    expect(() => assertClean('ok', 'x')).not.toThrow()
    expect(() => assertClean('mal\uE1BF', 'x')).toThrow(/U\+E1BF/)
    expect(() => assertClean('mal\uFFFD', 'x')).toThrow(/U\+FFFD/)
  })

  it('une los fragmentos de una misma fila en orden visual', () => {
    const page: RawPage = { page: 1, text: '', links: [], lines: [line('A-', 100), line('Forecasting', 100.8, 90), line('B- Quotas', 88)] }
    expect(visualLines(page)).toEqual(['A- Forecasting', 'B- Quotas'])
    expect(() => visualLines({ page: 2, text: '', links: [] })).toThrow(/npm run extract/)
  })
})

describe('parseFreecram', () => {
  const page = (n: number, text: string, links = []): RawPage => ({ page: n, text, links })
  const pages = [
    page(1, 'Exam : ADM-201'),
    page(2, 'IT Certification Guaranteed, The Easy Way!\nNO.1 Which two tools should an\nadmin use?31\nA. Approval Process1\nB. Flow\n2'),
    page(3, 'IT Certification Guaranteed, The Easy Way!\nBuilder\nC. Macro\nAnswer: A B\nExplanation:\n4\nBecause.\n3'),
  ]

  it('une preguntas que cruzan de página y limpia los artefactos de cita', () => {
    const [q] = parseFreecram(pages)
    expect(q).toMatchObject({
      id: 'fc-001',
      stem: 'Which two tools should an admin use?',
      options: [
        { key: 'A', text: 'Approval Process' },
        { key: 'B', text: 'Flow Builder' },
        { key: 'C', text: 'Macro' },
      ],
      correct: ['A', 'B'],
      sourceExplanation: 'Because.',
    })
  })

  it('falla si la numeración no es correlativa', () => {
    const broken = [pages[0], page(2, 'NO.2 Stem\nA. a\nB. b\nC. c\nAnswer: A')]
    expect(() => parseFreecram(broken)).toThrow(/NO\.1/)
  })
})

describe('parseSuccess4exam', () => {
  const page = (n: number, lines: RawLine[]): RawPage => ({ page: n, text: 'orden interno, no se usa', lines, links: [] })
  const block = (choose: string) => [
    page(1, [line('Portada', 700)]),
    page(2, [line('Bienvenida', 700)]),
    page(3, [
      line('Salesforce Certified Platform Administrator – Practice Test', 800),
      line('Question 1', 760),
      line('Which two features help a', 748),
      line('sales director forecast revenue?', 736),
      line(choose, 724),
      line('Options:', 712),
      line('A-', 700),
      line('Forecasting', 700.5, 90),
      line('B- Opportunity List', 688),
      line('View', 676),
      line('C- Sales Quotas', 664),
      line('Correct Answer: A, C', 652),
      line('Overall Explanation:', 640),
      line('Forecasting predicts revenue.', 628),
      line('3', 40),
    ]),
  ]

  it('lee enunciado, opciones partidas, clave y explicación en orden visual', () => {
    expect(parseSuccess4exam(block('Choose 2 answers.'))).toEqual([
      {
        id: 's4e-001',
        source: 'success4exam',
        ref: 'Q1',
        stem: 'Which two features help a sales director forecast revenue?',
        options: [
          { key: 'A', text: 'Forecasting' },
          { key: 'B', text: 'Opportunity List View' },
          { key: 'C', text: 'Sales Quotas' },
        ],
        correct: ['A', 'C'],
        shuffle: true,
        learnMore: [],
        sourceExplanation: 'Forecasting predicts revenue.',
      },
    ])
  })

  it('falla si «Choose N answers» no cuadra con la clave', () => {
    expect(() => parseSuccess4exam(block('Choose 3 answers.'))).toThrow(/pide 3 respuestas y la clave tiene 2/)
  })
})

describe('Trailhead', () => {
  const pages: RawPage[] = [
    {
      page: 1,
      text: [
        'Trailhead Document',
        'Unit 2: Configuration and Setup',
        'Scenario 1',
        'Which two settings let users edit',
        'records from list views? (Choose two answers.)',
        'A ENABLE INLINE',
        'EDITING',
        'Correct. Users edit fields from the list.',
        'B ENABLE ENHANCED',
        'LISTS Correct. Lists are faster.',
        'C ENABLE ENHANCED',
        'PAGE LAYOUT',
        '1',
      ].join('\n'),
      links: [],
    },
    {
      page: 2,
      text: [
        'Trailhead Document',
        'Incorrect. It edits page layouts.',
        'EDITOR',
        'D LOCALE SETTINGS Incorrect. Not a UI setting.',
        'TIME ZONE Incorrect. Neither is this.',
        'Exam Topic Flashcards',
        'Card 1',
        '2',
      ].join('\n'),
      links: [],
    },
  ]
  const casing = {
    'th-u2-01:A': 'Enable Inline Editing',
    'th-u2-01:B': 'Enable Enhanced Lists',
    'th-u2-01:C': 'Enable Enhanced Page Layout Editor',
    'th-u2-01:D': 'Locale settings',
    'th-u2-01:E': 'Time zone',
  }

  it('lee la clave de las marcas Correct/Incorrect, con filas partidas y una quinta opción sin letra', () => {
    expect(readScenarios(pages)).toEqual([
      {
        id: 'th-u2-01',
        ref: 'U2 E1',
        stem: 'Which two settings let users edit records from list views?',
        options: [
          { key: 'A', source: 'ENABLE INLINE EDITING', correct: true },
          { key: 'B', source: 'ENABLE ENHANCED LISTS', correct: true },
          { key: 'C', source: 'ENABLE ENHANCED PAGE LAYOUT EDITOR', correct: false },
          { key: 'D', source: 'LOCALE SETTINGS', correct: false },
          { key: 'E', source: 'TIME ZONE', correct: false },
        ],
      },
    ])
  })

  it('muestra las opciones con su grafía, que debe tener las mismas palabras', () => {
    const [q] = parseTrailhead(pages, { casing, questions: [] })
    expect(q.options.map((o) => o.text)).toEqual(Object.values(casing))
    expect(q.correct).toEqual(['A', 'B'])
    expect(() => parseTrailhead(pages, { casing: { ...casing, 'th-u2-01:E': 'Time zones' }, questions: [] })).toThrow(/no coincide/)
    expect(() => parseTrailhead(pages, { casing: { ...casing, 'th-u2-02:A': 'Sobra' }, questions: [] })).toThrow(/no existe/)
  })
})

describe('manualQuestions', () => {
  const pages: RawPage[] = [{ page: 1, text: 'Which tool deletes records\nbased on field values? Flow\nBuilder', links: [] }]
  const question = {
    id: 'dbf-001',
    ref: '#1',
    stem: 'Which tool deletes records based on field values?',
    options: [
      { key: 'A', text: 'Flow Builder' },
      { key: 'B', text: 'Validation rule' },
      { key: 'C', text: 'Roll-up summary field' },
    ],
    correct: ['A'],
    quotes: ['Which tool deletes records based on field values? Flow Builder'],
    authoredOptions: true,
  }

  it('exige que cada cita aparezca en la fuente, sin importar saltos de línea ni mayúsculas', () => {
    expect(manualQuestions('debrief', pages, [question])).toEqual([
      {
        id: 'dbf-001',
        source: 'debrief',
        ref: '#1',
        stem: question.stem,
        options: question.options,
        correct: ['A'],
        shuffle: true,
        learnMore: [],
        authoredOptions: true,
      },
    ])
    expect(() => manualQuestions('debrief', pages, [{ ...question, quotes: ['Which tool creates records?'] }])).toThrow(/no aparece en la fuente/)
    expect(() => manualQuestions('debrief', pages, [{ ...question, correct: ['D'] }])).toThrow(/no es una opción/)
  })
})

describe('FreeCram v2 (NEW QUESTION y NO.N con pies)', () => {
  const page = (text: string, number = 1): RawPage => ({ page: number, text, links: [] })
  const ad = [
    'Valid Platform-App-Builder Dumps shared by EduDump',
    'Get 35%OFF Special Discount Code: freecram)',
  ]
  const fmt = { source: 'abfc143' as const, prefix: 'ab-fc143', layout: 'new' as const }

  it('lee la pregunta, sus opciones y la clave visible', () => {
    const pages = [
      page(['NEW QUESTION: 1', 'Which tool creates records?', 'A. Flow', 'B. Process Builder', 'C. Apex', 'Answer: A,C', 'Explanation: Flow and Apex create records.'].join('\n')),
    ]
    const [q] = parseFreecram2(pages, fmt)
    expect(q).toMatchObject({
      id: 'ab-fc143-001',
      source: 'abfc143',
      ref: '#1',
      stem: 'Which tool creates records?',
      correct: ['A', 'C'],
      sourceExplanation: 'Flow and Apex create records.',
    })
    expect(q.options.map((o) => o.key)).toEqual(['A', 'B', 'C'])
  })

  it('quita pies de página, anuncios de EduDump, separadores y números sueltos', () => {
    const pages = [
      page(['NEW QUESTION: 1', 'Stem text', 'A. One', 'B. Two', 'C. Three', 'Answer: A', '---', '1', 'IT Certification Guaranteed, The Easy Way!', ...ad, 'Explanation: x'].join('\n')),
    ]
    const [q] = parseFreecram2(pages, fmt)
    expect(q.stem).toBe('Stem text')
    expect(q.options.map((o) => o.text)).toEqual(['One', 'Two', 'Three'])
    expect(q.sourceExplanation).toBe('x')
  })

  it('con (SHOW ANSWER) la clave sale de data/answers y con (LEAVE A REPLY) de la línea', () => {
    const pages = [
      page(['NEW QUESTION: 1', 'Stem', 'A. One', 'B. Two', 'C. Three', 'Answer: (SHOW ANSWER)'].join('\n')),
      page(['NEW QUESTION: 2', 'Stem', 'A. One', 'B. Two', 'C. Three', 'Answer: B (LEAVE A REPLY)'].join('\n')),
    ]
    const [hidden, visible] = parseFreecram2(pages, { ...fmt, keys: { '1': ['C', 'A'] } })
    expect(hidden.correct).toEqual(['C', 'A'])
    expect(visible.correct).toEqual(['B'])
  })

  it('una clave oculta sin entrada en data/answers queda vacía, para que el build la rechace', () => {
    const pages = [page(['NEW QUESTION: 1', 'Stem', 'A. One', 'B. Two', 'C. Three', 'Answer: (SHOW ANSWER)'].join('\n'))]
    const [q] = parseFreecram2(pages, fmt)
    expect(q.correct).toEqual([])
  })

  it('une la clave cuando va partida en dos líneas', () => {
    const pages = [page(['NEW QUESTION: 1', 'Stem', 'A. One', 'B. Two', 'C. Three', 'Answer: A,', 'C'].join('\n'))]
    const [q] = parseFreecram2(pages, fmt)
    expect(q.correct).toEqual(['A'])
  })

  it('lee el formato NO.N con pies, y su numeración', () => {
    const pages = [
      page(['NO.1 Pick the right one', 'A. One', 'B. Two', 'C. Three', 'Answer: C', 'Explanation: because'].join('\n')),
      page(['NO.2 Second', 'A. One', 'B. Two', 'C. Three', 'Answer: A', 'Explanation: because'].join('\n'), 2),
    ]
    const qs = parseFreecram2(pages, { source: 'abfc35', prefix: 'ab-fc35', layout: 'numbered' })
    expect(qs.map((q) => q.ref)).toEqual(['NO.1', 'NO.2'])
    expect(qs[0].stem).toBe('Pick the right one')
  })

  it('ignora la portada de V23.35, con el título partido en dos líneas', () => {
    const cover = page(['Exam : Platform-App-Builder', 'Title : Salesforce Certified Platform', 'App Builder', 'Vendor : Salesforce', 'Version : V23.35'].join('\n'))
    const first = page(['IT Certification Guaranteed, The Easy Way!', 'NO.1 Pick one', 'A. One', 'B. Two', 'C. Three', 'Answer: B', 'Explanation: x'].join('\n'), 2)
    const qs = parseFreecram2([cover, first], { source: 'abv2335', prefix: 'ab-v2335', layout: 'numbered' })
    expect(qs.map((q) => [q.id, q.stem, q.correct])).toEqual([['ab-v2335-001', 'Pick one', ['B']]])
  })

  it('tidy arregla apóstrofos, comillas, puntuación y __c sin tocar lo que no es ruido', () => {
    expect(tidy("The manager ' s sign-off isn ' t needed")).toBe("The manager's sign-off isn't needed")
    expect(tidy('status changes to " Critical " . The flow')).toBe('status changes to "Critical". The flow')
    expect(tidy('Add Inspection__c and Sun_c , Opt_In_c .')).toBe('Add Inspection__c and Sun__c, Opt_In__c.')
    expect(tidy('a field `Account_Region ` or the `Sun_c` object')).toBe('a field Account_Region or the Sun__c object')
    expect(tidy('the most current version Is active and fields To rich text')).toBe('the most current version is active and fields to rich text')
    // con la palabra siguiente en mayúscula puede ser un título o un nombre: se deja
    expect(tidy('Rules Of Engagement and Go To Setup')).toBe('Rules Of Engagement and Go To Setup')
    // comillas impares, o pares que no todos llevan espacios dentro: las comillas se dejan como están
    expect(tidy('UserRole.Name = " Marketing \' , ISCHANGED')).toBe('UserRole.Name = " Marketing \', ISCHANGED')
    expect(tidy('"Yes" , " No "')).toBe('"Yes", " No "')
    // el apóstrofo de un posesivo plural es ambiguo con una comilla simple de cierre: no se toca
    expect(tidy("Cloud Kicks ' external site")).toBe("Cloud Kicks ' external site")
  })

  it('falla si la numeración salta un número', () => {
    const pages = [page(['NEW QUESTION: 1', 'Stem', 'A. One', 'B. Two', 'C. Three', 'Answer: A'].join('\n') + '\n' + ['NEW QUESTION: 3', 'Stem', 'A. One', 'B. Two', 'C. Three', 'Answer: A'].join('\n'))]
    expect(() => parseFreecram2(pages, fmt)).toThrow(/se esperaba la pregunta 2 y aparece la 3/)
  })

  it('falla si el enunciado o una opción no tienen texto (imagen sin transcribir)', () => {
    const pages = [page(['NEW QUESTION: 1', 'A. One', 'B. Two', 'C. Three', 'Answer: A'].join('\n'))]
    expect(() => parseFreecram2(pages, fmt)).toThrow(/sin transcribir: #1/)
  })

  it('usa la transcripción de data/manual cuando el enunciado es imagen', () => {
    const pages = [page(['NEW QUESTION: 1', 'A. One', 'B. Two', 'C. Three', 'Answer: A'].join('\n'))]
    const [q] = parseFreecram2(pages, { ...fmt, images: { '1': { stem: 'Transcribed stem', options: { A: 'Alpha', B: 'Beta', C: 'Gamma' } } } })
    expect(q.stem).toBe('Transcribed stem')
    expect(q.options.map((o) => o.text)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
})

// Regresión con los datos reales: solo si se ha ejecutado `npm run extract` en esta máquina.
describe.each(SOURCES)('parser de $id', (source) => {
  it.skipIf(!existsSync(rawPath(source.id)))('reproduce data/parsed', () => {
    const questions = parsers[source.id](readJson<RawPage[]>(rawPath(source.id)))
    expect(questions).toHaveLength(source.questions)
    expect(questions).toEqual(readJson<ParsedQuestion[]>(parsedPath(source.id)))
  })
})
