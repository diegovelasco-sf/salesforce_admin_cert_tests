/** Texto en forma comparable para buscar: minúsculas, sin tildes y sin signos. */
export const canonicalSearch = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .trim()
