import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, emptyProgress, exportProgress, loadProgress, parseProgress, saveProgress } from './storage.ts'

function memoryStorage(initial: Record<string, string> = {}): Storage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('loadProgress', () => {
  it('empieza vacío si no hay nada guardado', () => {
    expect(loadProgress(memoryStorage())).toEqual({ progress: emptyProgress() })
  })

  it('recupera lo guardado', () => {
    const storage = memoryStorage()
    const progress = { ...emptyProgress(), flagged: ['fc-001'] }
    saveProgress(storage, progress)
    expect(loadProgress(storage).progress).toEqual(progress)
  })

  it('si el JSON está corrupto, hace copia de seguridad y empieza de cero', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{roto' })
    const { progress, backupKey } = loadProgress(storage, 123)
    expect(progress).toEqual(emptyProgress())
    expect(backupKey).toBe(`${STORAGE_KEY}.backup-123`)
    expect(storage.data.get(backupKey!)).toBe('{roto')
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
  })

  it('si la versión es desconocida, también hace copia de seguridad', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 99 }) })
    expect(loadProgress(storage, 5).backupKey).toBe(`${STORAGE_KEY}.backup-5`)
  })
})

describe('parseProgress', () => {
  it('completa los ajustes que falten y la exportación se puede volver a importar', () => {
    const progress = parseProgress(JSON.stringify({ schemaVersion: 1, settings: { officialOnly: true } }))
    expect(progress.settings).toEqual({ excludeDoubtful: true, officialOnly: true })
    expect(parseProgress(exportProgress(progress))).toEqual(progress)
  })

  it('rechaza lo que no es un progreso de la app', () => {
    expect(() => parseProgress('[]')).toThrow()
    expect(() => parseProgress('"hola"')).toThrow()
  })
})
