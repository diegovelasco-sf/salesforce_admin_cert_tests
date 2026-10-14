import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ParsedQuestion } from '../../src/domain/types.ts'
import { SOURCES, parsedPath, rawPath, readJson, type RawLine, type RawPage } from '../paths.ts'
import { parseFreecram } from './freecram.ts'
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

// Regresión con los datos reales: solo si se ha ejecutado `npm run extract` en esta máquina.
describe.each(SOURCES)('parser de $id', (source) => {
  it.skipIf(!existsSync(rawPath(source.id)))('reproduce data/parsed', () => {
    const questions = parsers[source.id](readJson<RawPage[]>(rawPath(source.id)))
    expect(questions).toHaveLength(source.questions)
    expect(questions).toEqual(readJson<ParsedQuestion[]>(parsedPath(source.id)))
  })
})
