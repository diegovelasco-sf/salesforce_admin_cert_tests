// Ejecuta los parsers sobre data/raw/ y guarda el resultado en data/parsed/<id>.json.
// data/parsed/ está versionado: su diff sirve de test de regresión de los parsers.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { SOURCES, parsedPath, rawPath, readJson, type RawPage } from '../paths.ts'
import { parsers } from './parsers.ts'

for (const source of SOURCES) {
  const raw = rawPath(source.id)
  if (!existsSync(raw)) {
    console.error(`Falta ${raw}. Ejecuta antes: npm run extract -- "<carpeta de los PDF>"`)
    process.exit(1)
  }
  const questions = parsers[source.id](readJson<RawPage[]>(raw))
  if (questions.length !== source.questions) {
    console.error(`${source.id}: se esperaban ${source.questions} preguntas y hay ${questions.length}`)
    process.exit(1)
  }
  const out = parsedPath(source.id)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(questions, null, 2) + '\n')
  const multi = questions.filter((q) => q.correct.length > 1).length
  console.log(`${source.id}: ${questions.length} preguntas (${multi} de varias respuestas) → ${out}`)
}
