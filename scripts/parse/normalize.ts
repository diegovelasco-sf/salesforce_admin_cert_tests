// Utilidades para limpiar el texto que PDFKit extrae de los PDF.
import type { RawPage } from '../paths.ts'

/** NFKC deshace ligaduras como ﬀ o ﬃ; la de "ft" PDFKit la deja como un carácter de uso privado. */
export function normalizeText(text: string): string {
  return text.normalize('NFKC').replace(/\uE1BF/g, 'ft')
}

/** Une líneas partidas: con un espacio, salvo si la anterior acaba en guion. */
export function joinLines(lines: string[]): string {
  let out = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!out) out = line
    else if (out.endsWith('-')) out += line
    else out += ' ' + line
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Líneas de la página en orden visual. Algunos PDF guardan el texto desordenado (la continuación de una
 * opción antes que la opción); aquí se ordena por posición y se unen los fragmentos de una misma fila.
 */
export function visualLines(page: RawPage): string[] {
  if (!page.lines) fail(`página ${page.page} sin líneas en orden visual: vuelve a ejecutar npm run extract`)
  const rows: { y: number; parts: string[] }[] = []
  for (const line of page.lines) {
    const last = rows.at(-1)
    if (last && Math.abs(last.y - line.y) < 2) last.parts.push(line.text)
    else rows.push({ y: line.y, parts: [line.text] })
  }
  return rows.map((row) => row.parts.map((part) => part.trim()).join(' '))
}

export const isPageNumber = (line: string): boolean => /^\d{1,3}$/.test(line.trim())

/** Uso privado, U+FFFD, guion blando, anchos cero, controles y surrogates sueltos. */
// eslint-disable-next-line no-control-regex -- se buscan justo esos caracteres
const SUSPICIOUS = /[\uE000-\uF8FF\uFFFD\u00AD\u200B-\u200D\u2060\uFEFF\u0000-\u0008\u000B-\u001F\u007F]|[\uD800-\uDFFF]/u

/** Lanza si el texto conserva caracteres que delatan un problema de extracción. */
export function assertClean(text: string, where: string): void {
  const match = SUSPICIOUS.exec(text)
  if (!match) return
  const code = match[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
  const context = text.slice(Math.max(0, match.index - 25), match.index + 25)
  throw new Error(`${where}: carácter sospechoso U+${code} en "${context}"`)
}

/** Forma canónica para comparar textos: minúsculas, comillas rectas y sin puntuación ni espacios extra. */
export function canonical(text: string): string {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^a-z0-9'"$% ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const nextLetter = (letter: string): string => String.fromCharCode(letter.charCodeAt(0) + 1)

export function fail(message: string): never {
  throw new Error(message)
}
