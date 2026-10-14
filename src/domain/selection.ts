/** Selección tras pulsar una opción: en las de una respuesta la sustituye; en las de varias, alterna sin pasar de `max`. */
export function toggleSelection(selected: readonly string[], key: string, max: number): string[] {
  if (max <= 1) return [key]
  if (selected.includes(key)) return selected.filter((k) => k !== key)
  return selected.length < max ? [...selected, key] : [...selected]
}
