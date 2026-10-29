import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ParsedQuestion, SourceId } from '../../src/domain/types.ts'
import { DATA, readJson, type RawPage } from '../paths.ts'
import { parseAdx201, type AdxAnswers } from './adx201.ts'
import { parseCrt101 } from './crt101.ts'
import { parseFreecram } from './freecram.ts'
import { parseFreecram2, type ImageFix } from './freecram2.ts'
import { manualQuestions, type ManualQuestion } from './manual.ts'
import { APP_BUILDER_S4E, parseSuccess4exam } from './success4exam.ts'
import { parseTrailhead, type TrailheadManual } from './trailhead.ts'

const manual = <T>(id: string): T => readJson<T>(join(DATA, 'manual', `${id}.json`))

/** Claves que el PDF oculta, transcritas en data/answers/<fuente>.json por número de pregunta. */
const hiddenKeys = (id: string): Record<string, string[]> => {
  const path = join(DATA, 'answers', `${id}.json`)
  return existsSync(path) ? readJson<Record<string, string[]>>(path) : {}
}

/** Imágenes del PDF transcritas a mano en data/manual/<fuente>.images.json, por número de pregunta. */
const imageFixes = (id: string): Record<string, ImageFix> => {
  const path = join(DATA, 'manual', `${id}.images.json`)
  return existsSync(path) ? readJson<Record<string, ImageFix>>(path) : {}
}

export const parsers: Record<SourceId, (pages: RawPage[]) => ParsedQuestion[]> = {
  freecram: parseFreecram,
  crt101: parseCrt101,
  adx201: (pages) => parseAdx201(pages, readJson<AdxAnswers>(join(DATA, 'answers', 'adx201.json'))),
  success4exam: parseSuccess4exam,
  trailhead: (pages) => parseTrailhead(pages, manual<TrailheadManual>('trailhead')),
  debrief: (pages) => manualQuestions('debrief', pages, manual<{ questions: ManualQuestion[] }>('debrief').questions),
  abv2335: (pages) => parseFreecram2(pages, { source: 'abv2335', prefix: 'ab-v2335', layout: 'numbered', images: imageFixes('abv2335') }),
  abs4e: (pages) => parseSuccess4exam(pages, APP_BUILDER_S4E),
  abfc143: (pages) =>
    parseFreecram2(pages, { source: 'abfc143', prefix: 'ab-fc143', layout: 'new', keys: hiddenKeys('abfc143'), images: imageFixes('abfc143') }),
  abfc108: (pages) =>
    parseFreecram2(pages, { source: 'abfc108', prefix: 'ab-fc108', layout: 'new', keys: hiddenKeys('abfc108'), images: imageFixes('abfc108') }),
  abfc35: (pages) => parseFreecram2(pages, { source: 'abfc35', prefix: 'ab-fc35', layout: 'numbered', images: imageFixes('abfc35') }),
}
