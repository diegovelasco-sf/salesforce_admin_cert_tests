// Genera src/data/questions.json a partir de data/parsed y data/curation.
// Uso: npm run bank            escribe el banco
//      npm run bank -- --check  falla si questions.json no está al día (no escribe)
//      --strict                 exige explicación y revisión explícita en todas las preguntas
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildBank } from './bank.ts'
import { BANK_PATH } from './paths.ts'

const args = new Set(process.argv.slice(2))
const { bank, errors, report } = buildBank({ strict: args.has('--strict') })
report.forEach((line) => console.log(line))

if (errors.length) {
  console.error(`\n${errors.length} errores:`)
  errors.forEach((error) => console.error(`  - ${error}`))
  process.exit(1)
}

const json = JSON.stringify(bank, null, 2) + '\n'
if (args.has('--check')) {
  if (!existsSync(BANK_PATH) || readFileSync(BANK_PATH, 'utf8') !== json) {
    console.error('src/data/questions.json no está al día: ejecuta npm run bank')
    process.exit(1)
  }
  console.log(`questions.json al día (${bank.hash})`)
} else {
  mkdirSync(dirname(BANK_PATH), { recursive: true })
  writeFileSync(BANK_PATH, json)
  console.log(`→ ${BANK_PATH} (${bank.hash})`)
}
