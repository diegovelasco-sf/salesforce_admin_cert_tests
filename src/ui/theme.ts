// Tema de color: «auto» sigue al sistema. Es global, como el idioma, y se guarda aparte del progreso.
export type Theme = 'auto' | 'light' | 'dark'
export const THEMES: readonly Theme[] = ['auto', 'light', 'dark']

const THEME_KEY = 'sf-theme'

export function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(theme: Theme): void {
  if (theme === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

export function saveTheme(theme: Theme): void {
  try {
    if (theme === 'auto') window.localStorage.removeItem(THEME_KEY)
    else window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Sin almacenamiento solo se pierde la preferencia.
  }
  applyTheme(theme)
}
