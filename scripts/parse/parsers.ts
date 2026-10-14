import { join } from 'node:path'
import type { ParsedQuestion, SourceId } from '../../src/domain/types.ts'
import { DATA, readJson, type RawPage } from '../paths.ts'
import { parseAdx201, type AdxAnswers } from './adx201.ts'
import { parseCrt101 } from './crt101.ts'
import { parseFreecram } from './freecram.ts'
import { manualQuestions, type ManualQuestion } from './manual.ts'
import { parseSuccess4exam } from './success4exam.ts'
import { parseTrailhead, type TrailheadManual } from './trailhead.ts'

const manual = <T>(id: string): T => readJson<T>(join(DATA, 'manual', `${id}.json`))

export const parsers: Record<SourceId, (pages: RawPage[]) => ParsedQuestion[]> = {
  freecram: parseFreecram,
  crt101: parseCrt101,
  adx201: (pages) => parseAdx201(pages, readJson<AdxAnswers>(join(DATA, 'answers', 'adx201.json'))),
  success4exam: parseSuccess4exam,
  trailhead: (pages) => parseTrailhead(pages, manual<TrailheadManual>('trailhead')),
  debrief: (pages) => manualQuestions('debrief', pages, manual<{ questions: ManualQuestion[] }>('debrief').questions),
}
