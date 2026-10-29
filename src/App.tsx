import { useEffect, useReducer, useState, type Reducer } from 'react'
import { isSubmitted } from './domain/session.ts'
import { loadProgress, saveProgress, type Progress } from './domain/storage.ts'
import type { CertId } from './domain/types.ts'
import { CERT_DATA } from './ui/bank.ts'
import { CertContext } from './ui/cert.ts'
import type { CertData } from './ui/certdata.ts'
import { CertSwitch } from './ui/CertSwitch.tsx'
import { Exam } from './ui/Exam.tsx'
import { History } from './ui/History.tsx'
import { Home } from './ui/Home.tsx'
import { I18nContext, readLang, saveLang, useI18n, type I18n } from './ui/lang.ts'
import { certTexts, MESSAGES, type Lang } from './ui/messages.ts'
import { PracticeRunner, PracticeSetup } from './ui/Practice.tsx'
import { Preparing } from './ui/Preparing.tsx'
import { Results } from './ui/Results.tsx'
import { Settings } from './ui/Settings.tsx'
import { seedDemo } from './ui/demo.ts'
import { createReducer, initState, type Action, type AppState, type Screen } from './ui/state.ts'

const CERT_KEY = 'sf-cert'

const readSelectedCert = (): CertId => {
  try {
    const saved = window.localStorage.getItem(CERT_KEY)
    return saved === 'appbuilder' ? 'appbuilder' : 'admin'
  } catch {
    return 'admin'
  }
}

const REDUCERS: Record<CertId, Reducer<AppState, Action>> = {
  admin: createReducer(CERT_DATA.admin),
  appbuilder: createReducer(CERT_DATA.appbuilder),
}

// En desarrollo, ?demo=… precarga un progreso de ejemplo (ver ui/demo.ts), solo en la certificación con la que se abre.
let demoPending = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('demo') : null

interface Boot {
  loaded: { progress: Progress; backupKey?: string }
  demoScreen?: Screen
}

// Se lee una sola vez por montaje: el inicializador de useReducer se ejecuta dos veces en StrictMode
// y la lectura puede tener efectos (copia de seguridad de datos dañados). Al cambiar de certificación
// se descarta (forget) para que la siguiente vez se lea de nuevo lo último guardado.
const booted = new Map<CertId, Boot>()
const forget = (cert: CertId) => booted.delete(cert)

function boot(data: CertData): Boot {
  const cached = booted.get(data.cert.id)
  if (cached) return cached
  const demoScreen = demoPending ? seedDemo(window.localStorage, data, demoPending) : undefined
  if (demoScreen) demoPending = null
  const entry: Boot = { loaded: loadProgress(window.localStorage, data.cert.id), demoScreen }
  booted.set(data.cert.id, entry)
  return entry
}

export default function App() {
  const [certId, setCertId] = useState<CertId>(readSelectedCert)
  const [lang, setLangState] = useState<Lang>(readLang)
  const data = CERT_DATA[certId]
  const t = MESSAGES[lang]

  // El idioma es global: se guarda aparte del progreso, así que vale igual para las dos certificaciones.
  const setLang = (next: Lang) => {
    saveLang(next)
    setLangState(next)
  }
  const i18n: I18n = { t, lang, setLang }

  useEffect(() => {
    document.title = t.app.docTitle(data.cert.name)
    document.documentElement.lang = lang
  }, [data, lang, t])

  const choose = (next: CertId) => {
    if (next === certId) return
    try {
      window.localStorage.setItem(CERT_KEY, next)
    } catch {
      // Sin almacenamiento solo se pierde la preferencia.
    }
    forget(next)
    setCertId(next)
  }

  return (
    <I18nContext.Provider value={i18n}>
      <CertContext.Provider value={data}>
        {/* La key reinicia todo el estado: cada certificación tiene su propio progreso, pantalla y simulacro. */}
        <CertApp key={certId} data={data} onChooseCert={choose} />
      </CertContext.Provider>
    </I18nContext.Provider>
  )
}

function CertApp({ data, onChooseCert }: { data: CertData; onChooseCert: (cert: CertId) => void }) {
  const { cert } = data
  const { t, lang } = useI18n()
  const [state, dispatch] = useReducer(REDUCERS[cert.id], undefined, () => {
    const { loaded, demoScreen } = boot(data)
    const initial = initState(data, loaded, Date.now())
    return demoScreen ? { ...initial, screen: demoScreen } : initial
  })
  const { progress, screen } = state

  useEffect(() => {
    try {
      saveProgress(window.localStorage, progress)
    } catch (error) {
      console.error('No se ha podido guardar el progreso', error)
    }
  }, [progress])

  const runKey = screen.name === 'practice' ? `${screen.run.kind}-${screen.run.questionIds[screen.run.index]}` : ''
  const examKey = screen.name === 'exam' ? progress.activeExam?.current : undefined
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen.name, runKey, examKey])

  const exam = progress.activeExam
  const preparing = data.bank.questions.length === 0
  const nav: { screen: 'home' | 'history' | 'settings'; label: string }[] = [
    { screen: 'home', label: t.app.nav.home },
    { screen: 'history', label: t.app.nav.history },
    { screen: 'settings', label: t.app.nav.settings },
  ]
  let content
  if (preparing) {
    content = <Preparing />
  } else {
    switch (screen.name) {
      case 'home':
        content = <Home progress={progress} notices={state.notices} dispatch={dispatch} />
        break
      case 'practice-setup':
        content = <PracticeSetup progress={progress} dispatch={dispatch} />
        break
      case 'practice':
        content = <PracticeRunner run={screen.run} progress={progress} dispatch={dispatch} />
        break
      case 'exam':
        content =
          exam && !isSubmitted(exam) ? (
            <Exam session={exam} dispatch={dispatch} />
          ) : exam ? (
            <Results session={exam} dispatch={dispatch} />
          ) : (
            <Home progress={progress} notices={state.notices} dispatch={dispatch} />
          )
        break
      case 'results':
        content = exam ? <Results session={exam} dispatch={dispatch} /> : <Home progress={progress} notices={state.notices} dispatch={dispatch} />
        break
      case 'history':
        content = <History progress={progress} />
        break
      case 'settings':
        content = <Settings progress={progress} dispatch={dispatch} />
        break
    }
  }

  // Durante un simulacro no se puede cambiar de certificación ni de pantalla.
  const inExam = screen.name === 'exam' && exam && !isSubmitted(exam)
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => dispatch({ type: 'navigate', screen: { name: 'home' } })}>
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
          {cert.name} <span className="brand-sub">· {t.app.brandSub}</span>
        </button>
        {!inExam && <CertSwitch value={cert.id} onChange={onChooseCert} />}
        {!inExam && !preparing && (
          <nav aria-label={t.app.navLabel}>
            {nav.map((item) => (
              <button
                key={item.screen}
                type="button"
                className={`nav-item${screen.name === item.screen ? ' on' : ''}`}
                aria-current={screen.name === item.screen ? 'page' : undefined}
                onClick={() => dispatch({ type: 'navigate', screen: { name: item.screen } })}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className="content">{content}</main>
      <footer className="footer muted">{certTexts(cert, lang).footer}</footer>
    </div>
  )
}
