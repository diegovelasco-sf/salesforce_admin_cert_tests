// Extrae el texto de los PDF de origen a data/raw/<id>.pages.json.
// Uso: npm run extract -- "<carpeta de los PDF>"
// Los PDF solo se leen: la ruta se pasa como argumento y no se ejecuta nada en su carpeta.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ROOT, SOURCES, rawPath, readJson, type RawPage } from './paths.ts'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: npm run extract -- "<carpeta de los PDF>"')
  process.exit(1)
}

const jxa = join(ROOT, 'scripts', 'jxa', 'pdf-text.js')

for (const source of SOURCES) {
  const pdf = resolve(dir, source.file)
  const out = rawPath(source.id)
  mkdirSync(dirname(out), { recursive: true })
  try {
    // PDFKit escribe avisos inofensivos de CoreGraphics en stderr: solo se muestran si falla.
    execFileSync('osascript', ['-l', 'JavaScript', jxa, pdf, out], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? ''
    console.error(`${source.id}: falló la extracción de ${pdf}\n${stderr}`)
    process.exit(1)
  }
  const pages = readJson<RawPage[]>(out)
  if (pages.length !== source.pages) {
    console.error(`${source.id}: se esperaban ${source.pages} páginas y hay ${pages.length}`)
    process.exit(1)
  }
  const chars = pages.reduce((sum, p) => sum + p.text.length, 0)
  console.log(`${source.id}: ${pages.length} páginas, ${chars} caracteres → ${out}`)
}
