import { useEffect, useMemo, useState } from 'react'
import { sampleVoltage } from '../lib/saCurrentExplorer'

function Plot({ data, fraction, phases, color, voltage = false, onScrub, label }) {
  const y = value => voltage ? 90 - (value + 100) / 140 * 80 : 50 - value * 36
  const path = useMemo(() => data.map(([t, v], i) =>
    `${i ? 'L' : 'M'}${(t * 1000).toFixed(2)},${(voltage ? 90 - (v + 100) / 140 * 80 : 50 - v * 36).toFixed(2)}`).join(' '), [data, voltage])
  const value = sampleVoltage(data, fraction)
  const scrubFromPointer = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    onScrub(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)))
  }
  return (
    <div className={`relative pl-[74px] pr-3 ${voltage ? 'h-[108px]' : 'h-[88px]'}`}>
      <div className="absolute left-0 top-0 bottom-0 w-[68px] text-right text-[11px] text-gray-300" aria-hidden="true">
        {voltage
          ? [-80, -40, 0, 40].map(v => <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(v)}%` }}>{v}</span>)
          : <>
            <span className="absolute right-0 top-2">Outward</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">Zero</span>
            <span className="absolute right-0 bottom-2">Inward</span>
          </>}
      </div>
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="h-full w-full touch-none cursor-crosshair"
        role="img" aria-label={label}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); scrubFromPointer(event) }}
        onPointerMove={event => { if (event.buttons === 1) scrubFromPointer(event) }}>
        {phases.map(phase => <rect key={phase.id} x={phase.start * 1000} y="0" width={(phase.end - phase.start) * 1000} height="100" fill={phase.color} fillOpacity=".055" />)}
        {!voltage && <path d={`${path} L${data.at(-1)[0] * 1000},50 L${data[0][0] * 1000},50 Z`} fill={color} />}
        {voltage
          ? [-80, -40, 0, 40].map(v => <line key={v} x1="0" x2="1000" y1={y(v)} y2={y(v)} stroke="#334155" strokeWidth=".6" vectorEffect="non-scaling-stroke" />)
          : <line x1="0" x2="1000" y1="50" y2="50" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        {phases.slice(1).map(phase => <line key={phase.id} x1={phase.start * 1000} x2={phase.start * 1000} y1="0" y2="100" stroke="#64748b" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <line x1={fraction * 1000} x2={fraction * 1000} y1="0" y2="100" stroke="#f8fafc" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pointer-events-none absolute inset-y-0 left-[74px] right-3">
        <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" style={{ left: `${fraction * 100}%`, top: `${y(value)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function IonicCurrentExplorer({ cells, cycleMs }) {
  const [cellId, setCellId] = useState('sa')
  const cell = cells.find(c => c.id === cellId)
  const { wave, phases, curves } = cell
  const [fraction, setFraction] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(.1)
  const currentPhase = phases.find(p => fraction >= p.start && fraction < p.end) ?? phases.at(-1)
  useEffect(() => {
    if (!playing) return
    let raf, last = null
    const tick = now => {
      if (last !== null) {
        const elapsed = Math.min(now - last, 100)
        setFraction(t => (t + elapsed * speed / cycleMs) % 1)
      }
      last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, cycleMs])
  const scrub = t => { setPlaying(false); setFraction(t) }
  return (
    <div className="max-w-6xl">
      <p className="mb-3 text-sm text-gray-200">Each current is scaled independently, including between cell types. Compare timing and direction, not curve heights. Scrub or drag across any graph to move the shared cursor.</p>
      <div className="sticky top-0 z-30 bg-gray-950 pb-2">
      <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-800 bg-gray-900 p-3 shadow-lg" aria-label="Current explorer controls">
        <label className="flex w-full items-center gap-3 text-sm font-semibold text-gray-100">
          Cell type
          <select value={cellId} aria-label="Current explorer cell type" onChange={event => { setCellId(event.target.value); scrub(0) }}
            className="min-w-0 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white">
            {cells.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <button type="button" className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-sm font-semibold text-white" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200" onClick={() => scrub(0)}>Restart cycle</button>
        <label className="flex min-w-[190px] flex-1 items-center gap-2 text-sm text-gray-200">
          Time
          <input type="range" min="0" max="1000" step="1" value={Math.round(fraction * 1000)}
            onChange={event => scrub(Number(event.target.value) / 1000)} aria-label="Current explorer cycle position"
            aria-valuetext={`${Math.round(fraction * cycleMs)} of ${Math.round(cycleMs)} milliseconds`} className="min-w-0 flex-1 accent-emerald-400" />
        </label>
        <span className="w-28 text-xs font-mono text-gray-200">{Math.round(fraction * cycleMs)} / {Math.round(cycleMs)} ms</span>
        <div className="flex gap-1" role="group" aria-label="Animation rate">
          {[.1, 1].map(rate => <button key={rate} type="button" aria-pressed={speed === rate} onClick={() => setSpeed(rate)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${speed === rate ? 'border-cyan-600 bg-cyan-950 text-cyan-100' : 'border-gray-600 text-gray-200'}`}>
            {rate === .1 ? 'Study rate · 0.1×' : 'Real time · 1×'}
          </button>)}
        </div>
      </div>
      <div className="rounded-xl border border-gray-700 bg-gray-900">
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-gray-700 px-3 py-2 text-xs">
          <span className="font-semibold text-gray-100">{cell.label} · one cycle</span>
          {[...new Map(phases.map(p => [p.name, p])).values()].map(phase => <span key={phase.name} style={{ color: phase.color }}>{phase.name}</span>)}
        </div>
        <div className="grid grid-cols-[170px_minmax(0,1fr)] items-center border-b border-gray-700 py-2 max-sm:grid-cols-[120px_minmax(0,1fr)]">
          <div className="px-3"><h3 className="text-sm font-semibold text-emerald-300">Membrane potential</h3><p className="text-xs text-gray-300">Vₘ (mV)</p>
            <p className="mt-2 min-h-8 text-xs" style={{ color: currentPhase.color }}>{currentPhase.name}</p>
          </div>
          <Plot data={wave.data} fraction={fraction} phases={phases} color="#34d399" voltage onScrub={scrub} label={`${cell.label} membrane potential`} />
        </div>
      </div>
      </div>
      <p className="my-3 text-sm leading-relaxed text-gray-200">{cell.note}</p>
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900/60">
        {curves.map(curve => (
          <div key={curve.id} className="grid grid-cols-[170px_minmax(0,1fr)] items-center border-b border-gray-800 py-1 max-sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="px-3 py-2">
              <h3 className="text-base font-semibold" style={{ color: curve.color }}>I<sub>{curve.subscript}</sub></h3>
              <p className="text-xs font-semibold text-gray-100">{curve.channel}</p>
              <p className="mt-1 text-[11px] text-gray-300">{curve.id === 'IK' ? <>I<sub>Kr</sub> and I<sub>Ks</sub> grouped here</> : curve.detail}</p>
            </div>
            <Plot data={curve.data} fraction={fraction} phases={phases} color={curve.color} onScrub={scrub}
              label={`${curve.label} through ${curve.channel}: schematic ${curve.direction} current, independently scaled`} />
          </div>
        ))}
        <div className="grid grid-cols-[170px_minmax(0,1fr)] py-2 max-sm:grid-cols-[120px_minmax(0,1fr)]">
          <span className="px-3 text-xs text-gray-300">Shared time axis</span>
          <div className="pl-[74px] pr-3">
            <div className="flex justify-between text-[11px] text-gray-300">{[0, .25, .5, .75, 1].map(t => <span key={t}>{Math.round(t * cycleMs)}</span>)}</div>
            <p className="text-center text-[11px] text-gray-300">Time (ms)</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-300">
        Each current is scaled independently, including between cell types. Compare timing and direction, not heights.
        Curves show selected currents, not channel open probability. Current depends on both channel gating and electrochemical driving force.
      </p>
      <details className="mt-3 rounded-lg border border-gray-700 p-3 text-xs leading-relaxed text-gray-300">
        <summary className="cursor-pointer font-semibold text-gray-100">About this teaching prototype</summary>
        <p className="mt-2">The current curves are schematic, not recordings or calculated current magnitudes, and are not summed to generate the displayed AP.
          The APs use the baseline teaching waveforms from Compare cell types, positioned here for studying each cell rather than conduction timing.
          Fixed conditions keep this explorer separate from Run experiments.</p>
        <p className="mt-2">Nodal delayed-rectifier K⁺ currents are grouped as I<sub>K</sub>; the AV example represents a simplified slow response phenotype, not every AV nodal cell.
          Only selected currents are shown. I<sub>K,ACh</sub>, exchanger and pump currents, intracellular calcium cycling, and regional differences are omitted.
          Purkinje calcium currents are represented only by I<sub>Ca,L</sub>. The selected currents alone do not fully explain automaticity or the AP.</p>
        <p className="mt-2">I<sub>K1</sub> is named for inward rectification, not a requirement to flow inward. It carries outward K⁺ current at voltages above E<sub>K</sub>,
          is suppressed during the plateau, and contributes to terminal repolarization. Near rest its current is small even when channels are available, because driving force is small.</p>
        <p className="mt-2">Physiological background (not sources of plotted values):{' '}
          <a className="text-cyan-300 underline" href="https://pubmed.ncbi.nlm.nih.gov/2432247/" target="_blank" rel="noreferrer">HCN current</a>{' · '}
          <a className="text-cyan-300 underline" href="https://pubmed.ncbi.nlm.nih.gov/16690884/" target="_blank" rel="noreferrer">T-type calcium current</a>{' · '}
          <a className="text-cyan-300 underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2290286/" target="_blank" rel="noreferrer">Delayed-rectifier potassium currents</a>
          {' · '}<a className="text-cyan-300 underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2764063/" target="_blank" rel="noreferrer">AV nodal model</a>
          {' · '}<a className="text-cyan-300 underline" href="https://pubmed.ncbi.nlm.nih.gov/9688927/" target="_blank" rel="noreferrer">Atrial currents</a>
          {' · '}<a className="text-cyan-300 underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2916994/" target="_blank" rel="noreferrer">Purkinje currents</a>
        </p>
      </details>
    </div>
  )
}
