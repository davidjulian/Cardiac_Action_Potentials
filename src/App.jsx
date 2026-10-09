import { useEffect, useRef, useState } from 'react'
import CardiacBridge from './pages/modules/CardiacBridge'
import { ModuleTabsProvider, useModuleTabsContext } from './context/ModuleTabsContext'

function LabSidebar({ onOpenAbout }) {
  const { tabInfo } = useModuleTabsContext()

  return (
    <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <svg viewBox="0 0 48 24" className="w-9 h-5" fill="none" aria-hidden="true">
            <polyline
              points="0,12 8,12 12,4 16,20 20,2 24,22 28,12 48,12"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-gray-100 text-sm font-semibold">Cardiac AP Lab</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Intracellular electrophysiology, excitation contraction coupling, and conduction
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Laboratory sections">
        <div className="space-y-1">
          {tabInfo?.tabs.map(tab => {
            const active = tab.id === tabInfo.active || tab.children?.some(child => child.id === tabInfo.active)
            const visited = tabInfo.visited?.has(tab.id)
            return (
              <div key={tab.id}>
              <button
                type="button"
                aria-current={!tab.children && active ? 'page' : undefined}
                onClick={() => tabInfo.setActive(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-800/70'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono ${
                  active ? 'bg-emerald-900/70 text-emerald-200' : 'bg-gray-800 text-gray-300'
                }`}>
                  {tab.number ?? tab.id}
                </span>
                <span className="flex-1 text-sm leading-tight">{tab.shortLabel || tab.label}</span>
                {!active && visited && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Visited" />
                )}
              </button>
              {tab.children && (
                <div className="ml-6 my-1 space-y-1 border-l border-gray-700 pl-2" role="group" aria-label="Action potentials submodules">
                  {tab.children.map(child => {
                    const selected = child.id === tabInfo.active
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => tabInfo.setActive(child.id)}
                        aria-current={selected ? 'page' : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${selected
                          ? 'border-emerald-700 bg-emerald-950/60 text-emerald-200'
                          : 'border-transparent text-gray-300 hover:bg-gray-800/70 hover:text-white'}`}
                      >
                        <span className="text-xs font-mono">{child.number}</span>
                        <span>{child.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              </div>
            )
          })}
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-300 leading-relaxed">
          Keep this app open beside the Canvas activity. Your quiz supplies the questions and explanations.
        </p>
        <button
          type="button"
          onClick={onOpenAbout}
          className="mt-3 text-xs text-gray-400 hover:text-emerald-300 transition-colors underline underline-offset-4 decoration-gray-700 hover:decoration-emerald-700"
        >
          About this app
        </button>
      </div>
    </aside>
  )
}

function AboutModal({ onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              About
            </p>
            <h2 id="about-title" className="mt-1 text-xl font-semibold text-gray-100">
              Cardiac Action Potentials Lab
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-700 text-xl leading-none text-gray-400 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Close About dialog"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 space-y-4 text-sm leading-relaxed text-gray-200">
          <div>
            <dt className="font-semibold text-gray-100">Original creator and primary developer</dt>
            <dd className="mt-1">Jacob Walker, UF BME Class of 2027</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Additional design and editing</dt>
            <dd className="mt-1">David Julian, Ph.D.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Development assistance</dt>
            <dd className="mt-1">Claude Code and OpenAI Codex</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Contact</dt>
            <dd className="mt-1">Jacob Walker: <a className="text-emerald-300 underline underline-offset-2" href="mailto:jacob.walker@ufl.edu">jacob.walker@ufl.edu</a></dd>
            <dd className="mt-1">David Julian: <a className="text-emerald-300 underline underline-offset-2" href="mailto:djulian@ufl.edu">djulian@ufl.edu</a></dd>
          </div>
        </dl>
        <p className="mt-5 border-t border-gray-700 pt-4 text-sm text-gray-200">© 2026 Jacob Walker and David Julian.</p>
      </section>
    </div>
  )
}

export default function App() {
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <ModuleTabsProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: '#0a0e1a' }}>
        <LabSidebar onOpenAbout={() => setAboutOpen(true)} />
        <main className="flex-1 min-w-0">
          <CardiacBridge />
        </main>
        {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      </div>
    </ModuleTabsProvider>
  )
}
