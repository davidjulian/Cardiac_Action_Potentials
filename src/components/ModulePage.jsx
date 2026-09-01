import { useNavigate } from 'react-router-dom'
import { useMode, MODULE_ORDER, MODE_ACCENT } from '../context/ModeContext'

/**
 * ModulePage — the visual shell every module page renders inside.
 *
 * Props:
 *   moduleId    — 'physics' | 'cardiac' | 'ECG' | 'scenarios'
 *   number      — 1-4
 *   title       — display title
 *   objective   — optional single "aha moment" statement, shown as a
 *                 compact inline box under the header. Omit to skip it.
 *   description — optional short paragraph under the header. Omit to skip.
 *   wide        — when true, use a considerably wider container and
 *                 tighter outer padding, for modules that need real
 *                 horizontal room for a multi-column dashboard layout
 *   children    — the interactive content (p5.js canvas, ECG strip, etc.)
 *                 When null, shows a "coming soon" placeholder
 */
export default function ModulePage({ moduleId, number, title, objective, description, wide = false, children }) {
  const { mode, progress, markComplete } = useMode()
  const navigate = useNavigate()

  const isLabMode  = mode === 'lab'
  const isComplete = progress.has(moduleId)
  const accent     = MODE_ACCENT[isLabMode ? 'lab' : 'free']

  const nextId   = MODULE_ORDER[MODULE_ORDER.indexOf(moduleId) + 1]
  const nextPath = nextId ? `/${isLabMode ? 'lab' : 'play'}/${nextId}` : null

  const handleMarkComplete = async () => {
    await markComplete(moduleId)
    if (isLabMode && nextPath) navigate(nextPath)
  }

  return (
    <div className={`min-h-screen mx-auto ${wide ? 'p-4 max-w-[1500px]' : 'p-5 max-w-4xl'}`}>

      {/* ── Module header — kept compact since it repeats above every tab ── */}
      <div className="mb-3">
        <div className="flex items-center gap-3">
          {/* Module number pill */}
          <span
            className="text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
            style={{
              color:           accent,
              backgroundColor: accent + '18',
              border:          `1px solid ${accent}35`,
            }}
          >
            Module {number}
          </span>

          {isComplete && (
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
              ✓ Completed
            </span>
          )}

          <h1 className="text-lg font-bold text-white">{title}</h1>
        </div>

        {/* Learning objective box — the "aha moment" — optional */}
        {objective && (
          <div
            className="mt-1.5 rounded-lg px-3 py-1.5 border flex items-baseline gap-2"
            style={{ backgroundColor: accent + '0c', borderColor: accent + '30' }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-semibold shrink-0"
              style={{ color: accent + 'aa' }}
            >
              Objective
            </p>
            <p className="text-xs text-gray-300 leading-snug">{objective}</p>
          </div>
        )}

        {/* Module description — optional */}
        {description && (
          <p className="text-gray-500 text-xs leading-snug mt-1.5">{description}</p>
        )}
      </div>

      {/* ── Interactive content ── */}
      <div className="mb-3">
        {children ?? (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 border-dashed p-16 text-center">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: accent + '15' }}
            >
              <svg className="w-7 h-7" style={{ color: accent + 'aa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">Interactive content coming in Step 2+</p>
            <p className="text-gray-600 text-xs mt-1">
              The physics simulations, ECG engine, and patient cases will live here
            </p>
          </div>
        )}
      </div>

      {/* ── Lab Mode: mark complete / advance ── */}
      {isLabMode && (
        <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            {isComplete
              ? 'This module is complete.'
              : 'Work through the material above, then mark this module complete to unlock the next one.'}
          </p>

          {!isComplete ? (
            <button
              onClick={handleMarkComplete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: accent + '20',
                color:           accent,
                border:          `1px solid ${accent}40`,
              }}
            >
              Mark complete
              {nextPath && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          ) : nextPath ? (
            <button
              onClick={() => navigate(nextPath)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Continue to next module
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ) : (
            <span className="text-sm text-emerald-400">All modules complete!</span>
          )}
        </div>
      )}
    </div>
  )
}
