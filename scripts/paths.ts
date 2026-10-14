import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { SourceId } from '../src/domain/types.ts'

export const ROOT = resolve(import.meta.dirname, '..')
export const DATA = join(ROOT, 'data')

export interface SourceInfo {
  id: SourceId
  file: string
  pages: number
  questions: number
}

export const SOURCES: SourceInfo[] = JSON.parse(readFileSync(join(DATA, 'sources.json'), 'utf8'))

export interface RawLink {
  url: string
  text: string
  y: number
}

/** Fragmento de texto con su posición: x desde la izquierda, y de la base desde abajo. */
export interface RawLine {
  text: string
  x: number
  y: number
}

export interface RawPage {
  page: number
  /** Texto en el orden interno del PDF. */
  text: string
  /** Fragmentos en orden visual (de arriba abajo y de izquierda a derecha). */
  lines?: RawLine[]
  links: RawLink[]
}

export const rawPath = (id: SourceId) => join(DATA, 'raw', `${id}.pages.json`)
export const parsedPath = (id: SourceId) => join(DATA, 'parsed', `${id}.json`)
export const curationPath = (id: SourceId) => join(DATA, 'curation', `${id}.json`)
export const BANK_PATH = join(ROOT, 'src', 'data', 'questions.json')

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
