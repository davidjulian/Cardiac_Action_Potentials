import { createContext, useContext, useState } from 'react'

const ModeContext = createContext(null)

// The two mode accent colors — single source of truth, used by ModulePage
// and ModuleTabs so an active tab and the module header agree on the color.
export const MODE_ACCENT = { lab: '#818cf8', free: '#2dd4bf' }

// The four modules in the order they appear in Lab Mode
export const MODULE_ORDER = ['physics', 'cardiac', 'ECG', 'scenarios']

// Metadata for each module (used by Sidebar and ModulePage)
export const MODULE_INFO = {
  physics: {
    id: 'physics',
    label: 'Physics foundations',
    number: 1,
    labPath:  '/lab/physics',
    playPath: '/play/physics',
  },
  cardiac: {
    id: 'cardiac',
    label: 'Cardiac electrophysiology',
    number: 2,
    labPath:  '/lab/cardiac',
    playPath: '/play/cardiac',
  },
  ECG: {
    id: 'ECG',
    label: 'ECG simulator & rhythms',
    number: 3,
    labPath:  '/lab/ECG',
    playPath: '/play/ECG',
  },
  scenarios: {
    id: 'scenarios',
    label: 'Patient scenarios',
    number: 4,
    labPath:  '/lab/scenarios',
    playPath: '/play/scenarios',
  },
}

export function ModeProvider({ children }) {
  // Retained legacy mode components use page-local state without an account.
  const [mode, setMode] = useState(null)
  const [progress, setProgress] = useState(new Set())
  const loadingMode = false

  const markComplete = (moduleId) => {
    setProgress(prev => new Set([...prev, moduleId]))
  }

  // A module is "unlocked" in Lab Mode if every preceding module is completed.
  // Module 1 (physics) is always unlocked.
  const isUnlocked = (moduleId) => {
    const idx = MODULE_ORDER.indexOf(moduleId)
    if (idx <= 0) return true
    return MODULE_ORDER.slice(0, idx).every(id => progress.has(id))
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, progress, markComplete, isUnlocked, loadingMode }}>
      {children}
    </ModeContext.Provider>
  )
}

// useMode hook — call this in any component to access mode state
export const useMode = () => {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside <ModeProvider>')
  return ctx
}
