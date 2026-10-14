import { useEffect, useReducer } from 'react'
import { isSubmitted } from './domain/session.ts'
import { loadProgress, saveProgress } from './domain/storage.ts'
import { BANK, QUESTIONS_BY_ID } from './ui/bank.ts'
import { Exam } from './ui/Exam.tsx'
import { History } from './ui/History.tsx'
import { Home } from './ui/Home.tsx'
import { PracticeRunner, PracticeSetup } from './ui/Practice.tsx'
import { Results } from './ui/Results.tsx'
import { Settings } from './ui/Settings.tsx'
import { seedDemo } from './ui/demo.ts'
import { createReducer, initState, type AppState } from './ui/state.ts'

// En desarrollo, ?demo=… precarga un progreso de ejemplo (ver ui/demo.ts).
const demoScreen = import.meta.env.DEV
  ? seedDemo(window.localStorage, BANK, QUESTIONS_BY_ID, new URLSearchParams(window.location.search).get('demo'))
  : undefined
// Se lee una sola vez al cargar el módulo: el inicializador de useReducer se ejecuta dos veces
// en StrictMode y la lectura puede tener efectos (copia de seguridad de datos dañados).
const loaded = loadProgress(window.localStorage)
const reducer = createReducer(QUESTIONS_BY_ID)
const init = (): AppState => {
  const state = initState(BANK, QUESTIONS_BY_ID, loaded, Date.now())
  return demoScreen ? { ...state, screen: demoScreen } : state
}

const NAV: { screen: 'home' | 'history' | 'settings'; label: string }[] = [
  { screen: 'home', label: 'Inicio' },
  { screen: 'history', label: 'Historial' },
  { screen: 'settings', label: 'Ajustes' },
]

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const { progress, screen } = state

  useEffect(() => {
    try {
      saveProgress(window.localStorage, progress)
    } catch (error) {
      console.error('No se ha podido guardar el progreso', error)
    }
  }, [progress])

  const runKey = screen.name === 'practice' ? `${screen.run.title}-${screen.run.questionIds[screen.run.index]}` : ''
  const examKey = screen.name === 'exam' ? progress.activeExam?.current : undefined
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen.name, runKey, examKey])

  const exam = progress.activeExam
  let content
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

  const inExam = screen.name === 'exam' && exam && !isSubmitted(exam)
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => dispatch({ type: 'navigate', screen: { name: 'home' } })}>
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
          Platform Administrator <span className="brand-sub">· simulador</span>
        </button>
        {!inExam && (
          <nav aria-label="Principal">
            {NAV.map((item) => (
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
      <footer className="footer muted">
        Uso personal. Preguntas de los cursos oficiales CRT101 y ADX201 de Trailhead Academy y del módulo de preparación de Trailhead, y de
        las fuentes no oficiales FreeCram, Success4Exam y Debrief (con claves revisadas). Tu progreso se guarda solo en este navegador.
      </footer>
    </div>
  )
}
