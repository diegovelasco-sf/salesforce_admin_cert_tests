import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS, emptyProgress, exportProgress, loadProgress, parseProgress, saveProgress } from './storage.ts'

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

const KEY = STORAGE_KEYS.admin

describe('STORAGE_KEYS', () => {
  it('cada certificación guarda en su clave, y la de Administrator es la de siempre', () => {
    expect(STORAGE_KEYS.admin).toBe('sf-platform-admin-quiz')
    expect(STORAGE_KEYS.appbuilder).not.toBe(STORAGE_KEYS.admin)
  })
})

describe('loadProgress', () => {
  it('empieza vacío si no hay nada guardado', () => {
    expect(loadProgress(memoryStorage(), 'admin')).toEqual({ progress: emptyProgress('admin') })
  })

  it('recupera lo guardado', () => {
    const storage = memoryStorage()
    const progress = { ...emptyProgress('admin'), flagged: ['fc-001'] }
    saveProgress(storage, progress)
    expect(loadProgress(storage, 'admin').progress).toEqual(progress)
  })

  it('si el JSON está corrupto, hace copia de seguridad y empieza de cero', () => {
    const storage = memoryStorage({ [KEY]: '{roto' })
    const { progress, backupKey } = loadProgress(storage, 'admin', 123)
    expect(progress).toEqual(emptyProgress('admin'))
    expect(backupKey).toBe(`${KEY}.backup-123`)
    expect(storage.data.get(backupKey!)).toBe('{roto')
    expect(storage.data.has(KEY)).toBe(false)
  })

  it('si la versión es desconocida, también hace copia de seguridad', () => {
    const storage = memoryStorage({ [KEY]: JSON.stringify({ schemaVersion: 99 }) })
    expect(loadProgress(storage, 'admin', 5).backupKey).toBe(`${KEY}.backup-5`)
  })

  it('el progreso guardado antes de las certificaciones (sin campo cert) es de Administrator', () => {
    const legacy = JSON.stringify({ schemaVersion: 1, stats: { 'fc-001': { seen: 1, correct: 1, streak: 1, lastCorrect: true, lastAt: 1 } }, flagged: ['fc-002'] })
    const storage = memoryStorage({ [KEY]: legacy })
    const { progress, backupKey } = loadProgress(storage, 'admin')
    expect(backupKey).toBeUndefined()
    expect(progress.cert).toBe('admin')
    expect(progress.flagged).toEqual(['fc-002'])
  })
})

describe('certificaciones independientes', () => {
  it('guardar una no toca la otra', () => {
    const storage = memoryStorage()
    saveProgress(storage, { ...emptyProgress('admin'), flagged: ['fc-001'] })
    saveProgress(storage, { ...emptyProgress('appbuilder'), flagged: ['ab-fc143-001'] })
    expect(loadProgress(storage, 'admin').progress.flagged).toEqual(['fc-001'])
    expect(loadProgress(storage, 'appbuilder').progress.flagged).toEqual(['ab-fc143-001'])
  })

  it('App Builder empieza vacío aunque Administrator tenga progreso', () => {
    const storage = memoryStorage()
    saveProgress(storage, { ...emptyProgress('admin'), flagged: ['fc-001'] })
    expect(loadProgress(storage, 'appbuilder')).toEqual({ progress: emptyProgress('appbuilder') })
  })

  it('un progreso de otra certificación en la clave equivocada se guarda como copia y no se carga', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.appbuilder]: JSON.stringify(emptyProgress('admin')) })
    const { progress, backupKey } = loadProgress(storage, 'appbuilder', 9)
    expect(progress).toEqual(emptyProgress('appbuilder'))
    expect(backupKey).toBe(`${STORAGE_KEYS.appbuilder}.backup-9`)
  })
})

describe('parseProgress', () => {
  it('completa los ajustes que falten y la exportación se puede volver a importar', () => {
    const progress = parseProgress(JSON.stringify({ schemaVersion: 1, settings: { officialOnly: true } }), 'admin')
    expect(progress.settings).toEqual({ excludeDoubtful: true, officialOnly: true })
    expect(parseProgress(exportProgress(progress), 'admin')).toEqual(progress)
  })

  it('rechaza lo que no es un progreso de la app', () => {
    expect(() => parseProgress('[]', 'admin')).toThrow()
    expect(() => parseProgress('"hola"', 'admin')).toThrow()
  })

  it('rechaza importar el progreso de una certificación en la otra', () => {
    const appbuilder = exportProgress(emptyProgress('appbuilder'))
    expect(() => parseProgress(appbuilder, 'admin')).toThrow(/otra certificación/)
    expect(() => parseProgress(exportProgress(emptyProgress('admin')), 'appbuilder')).toThrow(/otra certificación/)
    expect(parseProgress(appbuilder, 'appbuilder').cert).toBe('appbuilder')
  })
})
