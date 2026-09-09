import CardiacBridge from './pages/modules/CardiacBridge'
import { ModuleTabsProvider, useModuleTabsContext } from './context/ModuleTabsContext'

function LabSidebar() {
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
        <p className="text-xs text-gray-500 leading-relaxed">
          Intracellular electrophysiology, excitation contraction coupling, and conduction
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Laboratory sections">
        <p className="px-2 mb-2 text-[10px] uppercase tracking-widest text-gray-600">Explore</p>
        <div className="space-y-1">
          {tabInfo?.tabs.map(tab => {
            const active = tab.id === tabInfo.active
            const visited = tabInfo.visited?.has(tab.id)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => tabInfo.setActive(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-800/70'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono ${
                  active ? 'bg-emerald-900/70 text-emerald-200' : 'bg-gray-800 text-gray-500'
                }`}>
                  {tab.id}
                </span>
                <span className="flex-1 text-sm leading-tight">{tab.shortLabel || tab.label}</span>
                {!active && visited && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Visited" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-gray-800 text-[11px] text-gray-600 leading-relaxed">
        Keep this app open beside the Canvas activity. Your quiz supplies the questions and explanations.
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <ModuleTabsProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: '#0a0e1a' }}>
        <LabSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <CardiacBridge />
        </main>
      </div>
    </ModuleTabsProvider>
  )
}
