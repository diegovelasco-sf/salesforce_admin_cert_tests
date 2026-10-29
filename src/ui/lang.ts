// Idioma de la interfaz. Es global (no depende de la certificación) y se guarda aparte del progreso.
import { createContext, useContext } from 'react'
import { MESSAGES, type Lang, type Messages } from './messages.ts'

const LANG_KEY = 'sf-lang'

export function readLang(): Lang {
  try {
    return window.localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

export function saveLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    // Sin almacenamiento solo se pierde la preferencia.
  }
}

export interface I18n {
  t: Messages
  lang: Lang
  setLang: (lang: Lang) => void
}

export const I18nContext = createContext<I18n>({ t: MESSAGES.es, lang: 'es', setLang: () => {} })

/** Textos e idioma activos. */
export const useI18n = (): I18n => useContext(I18nContext)
