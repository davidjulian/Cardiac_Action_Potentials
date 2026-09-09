export default function ModulePage({ title, objective, description, wide = false, children }) {
  return (
    <div className={`min-h-screen mx-auto ${wide ? 'p-4 max-w-[1500px]' : 'p-5 max-w-4xl'}`}>
      <header className="mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-emerald-300 bg-emerald-950/60 border border-emerald-800/60">
            Interactive physiology
          </span>
          <h1 className="text-lg font-bold text-white">{title}</h1>
        </div>

        {objective && (
          <div className="mt-1.5 rounded-lg px-3 py-1.5 border border-emerald-900/60 bg-emerald-950/20 flex items-baseline gap-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold shrink-0 text-emerald-500">Objective</p>
            <p className="text-xs text-gray-300 leading-snug">{objective}</p>
          </div>
        )}

        {description && <p className="text-gray-500 text-xs leading-snug mt-1.5">{description}</p>}
      </header>

      <div className="mb-3">
        {children}
      </div>
    </div>
  )
}
