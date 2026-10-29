// Genera el banco de cada certificación (src/data/*.json) a partir de data/parsed y data/curation.
// Uso: npm run bank                       escribe los bancos de todas las certificaciones
//      npm run bank -- --cert appbuilder  solo el de una (admin | appbuilder)
//      npm run bank -- --check            falla si algún banco no está al día (no escribe)
//      --strict                           exige explicación y revisión explícita en todas las preguntas
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { CertId } from '../src/domain/types.ts'
import { buildBank } from './bank.ts'
import { BANK_PATHS } from './paths.ts'

const args = process.argv.slice(2)
const flags = new Set(args)
const certFlag = args.findIndex((arg) => arg === '--cert')
const requested = certFlag >= 0 ? args[certFlag + 1] : 'all'
const allCerts = Object.keys(BANK_PATHS) as CertId[]
if (requested !== 'all' && !allCerts.includes(requested as CertId)) {
  console.error(`--cert desconocido "${requested}": usa ${allCerts.join(', ')} o all`)
  process.exit(1)
}
const certs = requested === 'all' ? allCerts : [requested as CertId]

let failed = false
for (const cert of certs) {
  const bankPath = BANK_PATHS[cert]
  const { bank, errors, report } = buildBank({ cert, strict: flags.has('--strict') })
  report.forEach((line) => console.log(line))

  if (errors.length) {
    console.error(`\n[${cert}] ${errors.length} errores:`)
    errors.forEach((error) => console.error(`  - ${error}`))
    failed = true
    continue
  }

  const json = JSON.stringify(bank, null, 2) + '\n'
  if (flags.has('--check')) {
    if (!existsSync(bankPath) || readFileSync(bankPath, 'utf8') !== json) {
      console.error(`${bankPath} no está al día: ejecuta npm run bank`)
      failed = true
    } else console.log(`${cert}: banco al día (${bank.hash})`)
  } else {
    mkdirSync(dirname(bankPath), { recursive: true })
    writeFileSync(bankPath, json)
    console.log(`→ ${bankPath} (${bank.hash})`)
  }
}
if (failed) process.exit(1)
