/** 1:45:00, 12:05, 0:09 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()

/** Fecha y hora con el formato del idioma activo (`locale`, p. ej. es-ES o en-US). */
export function formatDate(ms: number, locale: string): string {
  let format = dateFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
    dateFormats.set(locale, format)
  }
  return format.format(ms)
}

/** Porcentaje entero hacia abajo, para no mostrar un 68 % que en realidad suspende. */
export const percent = (part: number, total: number): number => (total ? Math.floor((part * 100) / total) : 0)

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
