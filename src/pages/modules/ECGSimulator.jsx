import { useEffect, useRef, useState } from 'react'
import ModulePage from '../../components/ModulePage'
import HeartAnimation from '../../components/HeartAnimation'
import {
  LEADS, LEAD_ORDER,
  ECGVoltage,
  buildRhythmFromPhysiology,
  physiologyToRhythmId,
  meanQRSAxis,
  PHYSIOLOGY_DEFAULTS,
} from '../../lib/ECGEngine'
import { EinthovenAxisTriangle, AxisSummaryPanel } from '../../components/MeanAxisPanel'

// ── Canvas config ─────────────────────────────────────────────────────────────
const CW = 820, CH = 200
const PX_MS = 0.20     // horizontal: px per ms of trace
const PX_MV = 60       // vertical:   px per mV of signal
const BL    = 0.58     // baseline y-fraction (0 mV position)

const EMERALD    = '#10b981'
const GRID_MINOR = 'rgba(16,185,129,0.07)'
const GRID_MAJOR = 'rgba(16,185,129,0.18)'
const BASELINE_C = 'rgba(255,255,255,0.10)'

// ── UI param defaults ─────────────────────────────────────────────────────────
// Purely physiological — students never set PR/QRS/QT/axis directly. Every
// EKG measurement is a computed OUTPUT of buildRhythmFromPhysiology(), read
// back from its `derived` facts object.
const DEFAULT = PHYSIOLOGY_DEFAULTS

// ── Physiological interpretation banner ──────────────────────────────────────
// A single {mechanismText, clinicalName, level} — mechanism always comes
// first, the clinical/rhythm name only appears after. Priority-ordered from
// most to least clinically dominant so co-occurring derangements collapse to
// one coherent story rather than a laundry list.
function physiologicalInterpretation(derived) {
  const withIonNote = (base) => {
    if (!derived.ionAlert || base.ionHandled) return base
    return { ...base, mechanismText: `${base.mechanismText} ${derived.ionAlert}` }
  }

  if (derived.ionAlert?.startsWith('Sine-wave')) {
    return { mechanismText: derived.ionAlert, clinicalName: 'Severe Hyperkalemia — Sine Wave Pattern', level: 'danger', ionHandled: true }
  }
  if (derived.hyperkalemiaAlert) {
    return withIonNote({
      mechanismText: 'Extracellular potassium is critically elevated — every phase of the cardiac action potential is affected.',
      clinicalName: 'Critical Hyperkalemia', level: 'danger', ionHandled: true,
    })
  }
  if (derived.atrialRegime === 'fibrillation') {
    return withIonNote({
      mechanismText: 'The atrial refractory period has fallen below the re-entry threshold — multiple simultaneous circuits are sustaining themselves independently.',
      clinicalName: 'Atrial Fibrillation', level: 'danger',
    })
  }
  if (derived.atrialRegime === 'flutter') {
    return withIonNote({
      mechanismText: 'Re-entry established — a single circuit is sustaining itself. The atria are contracting roughly 4× faster than normal.',
      clinicalName: 'Atrial Flutter', level: 'warn',
    })
  }
  if (derived.ectopicCapture === 'captured') {
    return withIonNote({
      mechanismText: 'The ventricular ectopic focus is now firing faster than the SA node — it has captured control of the ventricles.',
      clinicalName: derived.ventricularRateBpm > 150 ? 'Sustained Ventricular Tachycardia' : 'Ventricular Tachycardia',
      level: 'danger',
    })
  }
  if (derived.ectopicCapture === 'fusion') {
    return withIonNote({
      mechanismText: 'Two pacemakers are firing at similar rates — fusion beats appear when the SA impulse and the ectopic impulse activate the ventricle simultaneously.',
      clinicalName: 'Fusion Beats', level: 'warn',
    })
  }
  if (derived.avRatio === Infinity) {
    if (derived.escapeSource === 'purkinje') {
      return withIonNote({
        mechanismText: 'Complete AV block. No atrial impulse reaches the ventricles — the Purkinje system is acting as an escape pacemaker.',
        clinicalName: 'Third-Degree AV Block (Junctional Escape)', level: 'danger',
      })
    }
    if (derived.escapeSource === 'ventricular') {
      return withIonNote({
        mechanismText: 'Complete AV block. No atrial impulse reaches the ventricles — ventricular muscle itself is now acting as the escape pacemaker.',
        clinicalName: 'Third-Degree AV Block (Ventricular Escape)', level: 'danger',
      })
    }
    return withIonNote({
      mechanismText: 'Complete AV block with no escape pacemaker firing — the ventricles are not contracting at all.',
      clinicalName: 'Ventricular Standstill', level: 'danger',
    })
  }
  if (derived.avRatio > 1) {
    return withIonNote(
      derived.avRecoveryBehavior === 'fatigue'
        ? {
            mechanismText: 'The AV node takes progressively longer to recover after each impulse, until one beat is finally blocked — then the node resets.',
            clinicalName: 'Mobitz I (Wenckebach)', level: 'warn',
          }
        : {
            mechanismText: 'The AV node either conducts or it doesn’t — recovery time is constant, so a blocked beat gives no warning.',
            clinicalName: 'Mobitz II', level: 'warn',
          }
    )
  }
  if (derived.leftImpairment >= 0.5 && derived.leftImpairment >= derived.rightImpairment) {
    return withIonNote({
      mechanismText: 'Left bundle branch conduction has failed. The left ventricle is now activated late, through slow muscle-to-muscle spread rather than fast Purkinje conduction.',
      clinicalName: 'Left Bundle Branch Block', level: 'warn',
    })
  }
  if (derived.rightImpairment >= 0.5 && derived.rightImpairment > derived.leftImpairment) {
    return withIonNote({
      mechanismText: 'Right bundle branch conduction has failed. The right ventricle activates late, producing a characteristic late rightward deflection.',
      clinicalName: 'Right Bundle Branch Block', level: 'warn',
    })
  }
  if (derived.prIntervalMs > 200) {
    return withIonNote({
      mechanismText: 'AV node conduction velocity is reduced — each SA impulse takes longer to traverse the node, but every impulse still gets through.',
      clinicalName: 'First-Degree AV Block', level: 'warn',
    })
  }
  if (derived.atrialErraticness > 0.3) {
    return withIonNote({
      mechanismText: 'The atrial refractory period is approaching the re-entry threshold — conduction is becoming erratic, though not yet organized into a circuit.',
      clinicalName: null, level: 'info',
    })
  }
  if (derived.effectiveSaRate > 100) {
    return withIonNote({
      mechanismText: `The SA node is firing at ${Math.round(derived.effectiveSaRate)} bpm, above the 60–100 bpm reference range.`,
      clinicalName: 'Sinus Tachycardia', level: 'info',
    })
  }
  if (derived.effectiveSaRate < 60) {
    return withIonNote({
      mechanismText: `The SA node is firing at ${Math.round(derived.effectiveSaRate)} bpm, below the 60–100 bpm reference range.`,
      clinicalName: 'Sinus Bradycardia', level: 'info',
    })
  }
  return withIonNote({
    mechanismText: 'All physiological parameters are within their normal reference ranges.',
    clinicalName: 'Normal Sinus Rhythm', level: 'ok',
  })
}

// ── Canvas drawing helpers ────────────────────────────────────────────────────
function drawGrid(ctx, w, h) {
  const byY  = h * BL
  const step = 40 * PX_MS
  ctx.lineWidth = 1
  let i = 0
  for (let x = 0; x <= w; x += step) {
    ctx.strokeStyle = i % 5 === 0 ? GRID_MAJOR : GRID_MINOR
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); i++
  }
  const mvStep = 0.5 * PX_MV
  ctx.strokeStyle = GRID_MINOR
  for (let y = byY; y <= h; y += mvStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  for (let y = byY; y >= 0; y -= mvStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  ctx.strokeStyle = BASELINE_C
  ctx.beginPath(); ctx.moveTo(0, byY); ctx.lineTo(w, byY); ctx.stroke()
}

function drawTrace(ctx, w, h, elapsedMs, { waves, cycleMs, nativeCycleMs }, leadAxisDeg) {
  const byY = h * BL
  ctx.beginPath()
  for (let x = 0; x <= w; x++) {
    const v = ECGVoltage(elapsedMs - (w - x) / PX_MS, cycleMs, waves, leadAxisDeg, nativeCycleMs)
    const y = byY - v * PX_MV
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = EMERALD; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke()
}

// ── Small sub-components ──────────────────────────────────────────────────────
function ParamSlider({ label, value, min, max, step = 1, unit = '', color, disabled, onChange, hint }) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none select-none' : ''}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-400">{label}</label>
        <span className="text-xs font-bold tabular-nums" style={{ color: color ?? '#e2e8f0' }}>
          {value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded accent-emerald-500" />
      {hint && <p className="text-xs text-gray-600 mt-0.5 leading-snug">{hint}</p>}
    </div>
  )
}

function SegBtn({ options, value, disabled, onChange }) {
  return (
    <div className={`flex rounded-lg overflow-hidden border border-gray-700 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 px-1.5 py-1.5 text-xs transition-colors leading-tight ${
            value === o.value
              ? 'bg-emerald-600/35 text-emerald-300 font-medium'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function NoteChip({ level }) {
  const map = {
    ok:     { color: '#10b981', label: 'Normal'   },
    info:   { color: '#60a5fa', label: 'Note'     },
    warn:   { color: '#f59e0b', label: 'Abnormal' },
    danger: { color: '#ef4444', label: 'Critical' },
  }
  const { color, label } = map[level] ?? map.info
  return (
    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: color + '1a', border: `1px solid ${color}40` }}>
      {label}
    </span>
  )
}

// Section header used by every physiology panel: structure name + one-line
// physiological description, matching Module 2's ANATOMY taxonomy/phrasing.
function SectionHeader({ title, description }) {
  return (
    <div className="mb-2">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {description && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>}
    </div>
  )
}

// Sections 6-7: closed by default (accordion), so their content costs
// nothing in the layout until a student opens them.
function CollapsibleSection({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 border-t border-gray-800 pt-2">
          {description && <p className="text-xs text-gray-500 mb-2 leading-snug">{description}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ECGSimulator() {
  const [params, setParams]   = useState(DEFAULT)
  const [leadId, setLeadId]   = useState('II')
  const [physRhythm, setPhysRhythm] = useState(() => buildRhythmFromPhysiology(DEFAULT))
  const canvasRef     = useRef(null)
  const heartClockRef = useRef({ elapsedMs: 0, cycleMs: 800, tInCycle: 0, nativeCycleMs: null })
  const activeRef      = useRef({ leadId: 'II', rhythm: buildRhythmFromPhysiology(DEFAULT) })

  // Keep rAF ref and animation rhythm in sync with latest state
  useEffect(() => {
    const r = buildRhythmFromPhysiology(params)
    setPhysRhythm(r)
    activeRef.current = { leadId, rhythm: r }
  }, [params, leadId])

  // Single rAF loop — reads rhythm from ref each frame
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let animId, t0 = null

    const render = (ts) => {
      if (t0 === null) t0 = ts
      const { rhythm, leadId: lid } = activeRef.current
      const { cycleMs, nativeCycleMs } = rhythm
      const elapsedMs = ts - t0
      heartClockRef.current = {
        elapsedMs,
        cycleMs,
        tInCycle: elapsedMs % cycleMs,
        nativeCycleMs,
      }
      ctx.clearRect(0, 0, CW, CH)
      drawGrid(ctx, CW, CH)
      drawTrace(ctx, CW, CH, elapsedMs, rhythm, LEADS[lid].axisDeg)
      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [])

  const set = (key, val) => setParams(p => ({ ...p, [key]: val }))

  const {
    saAutomaticity, firingRegularity,
    atrialConductionVelocityPct, atrialRefractoryMs,
    avConductionVelocityPct, avRecoveryBehavior, avRefractoryMs,
    leftBundleVelocityPct, rightBundleVelocityPct, purkinjeAutomaticity,
    ventricularApdMs, repolHeterogeneity, ventricularEctopicRate,
    sympatheticTone, parasympatheticTone,
    potassiumMEqL, calciumMgDl,
  } = params

  const derived = physRhythm.derived
  const axis = meanQRSAxis(physRhythm.waves)
  const rhythmId = physiologyToRhythmId(derived)
  const interp = physiologicalInterpretation(derived)

  const isBlock = avConductionVelocityPct === 0

  const qtcMs = (derived.qtIntervalMs && derived.ventricularRateBpm > 0)
    ? Math.round(derived.qtIntervalMs / Math.sqrt(60 / derived.ventricularRateBpm))
    : null
  const qtcColor = !qtcMs ? '#6b7280' : qtcMs > 500 ? '#ef4444' : qtcMs > 440 ? '#f59e0b' : '#10b981'
  const prColor  = !derived.prIntervalMs ? '#6b7280' : derived.prIntervalMs > 200 ? '#f59e0b' : '#10b981'
  const qrsColor = !derived.qrsDurationMs ? '#6b7280' : derived.qrsDurationMs > 140 ? '#ef4444' : derived.qrsDurationMs > 120 ? '#f59e0b' : '#10b981'

  const bannerColor = { ok: '#10b981', info: '#60a5fa', warn: '#f59e0b', danger: '#ef4444' }[interp.level]

  // AV Node's live "atrial rate → interval → ratio" calculation display
  const atrialIntervalForCalc = derived.atrialRegime === 'flutter' ? 200 : (derived.atrialIntervalMs ?? 60000 / saAutomaticity)
  const atrialRateForCalc     = derived.atrialRegime === 'flutter' ? 300 : Math.round(derived.effectiveSaRate ?? saAutomaticity)
  const effectiveRefractoryForCalc = derived.effectiveAvRefractoryMs ?? avRefractoryMs

  return (
    <ModulePage
      moduleId="ECG"
      number={3}
      title="ECG Simulator & Rhythm Library"
      description="Adjust the physiological properties of each structure below. Watch what happens to the EKG. The rhythm name will appear only after you produce it."
      wide
    >
      <div className="flex gap-4 items-start">

        {/* ══ LEFT COLUMN: waveform + interpretation ═══════════════════════
             Sticky — stays in view while the (much longer) parameter column
             scrolls, so the EKG/heart animation is always visible while
             adjusting a slider, however far down the panel it is. */}
        <div className="flex-[1.15] min-w-0 space-y-2 sticky top-4 self-start">

          {/* ── ECG strip + conduction animation ───────────────────────── */}
          <div className="rounded-xl bg-gray-950 border border-gray-800 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 uppercase tracking-widest">Lead</span>
                <div className="flex gap-1">
                  {LEAD_ORDER.map(id => (
                    <button key={id} onClick={() => setLeadId(id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        leadId === id
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-700/50'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}>
                      {id}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {derived.ventricularRateBpm > 0 ? (
                  <span className="text-gray-500">
                    Ventricular rate{' '}
                    <span className="text-white font-bold tabular-nums">{derived.ventricularRateBpm}</span> bpm
                  </span>
                ) : (
                  <span className="text-red-400 font-medium">Ventricular standstill</span>
                )}
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <HeartAnimation
                clockRef={heartClockRef}
                rhythmId={rhythmId}
                rhythm={physRhythm}
                className="shrink-0"
                width={170}
                height={200}
              />
              <div className="flex-1 min-w-0">
                <canvas ref={canvasRef} width={CW} height={CH} className="w-full rounded-lg"
                  style={{ backgroundColor: '#030712' }} />
                <p className="text-xs text-gray-700 mt-1 text-right">40 ms / small square · 0.5 mV / square</p>
              </div>
            </div>
          </div>

          {/* ── Current EKG measurements — a READOUT, not a control ─────── */}
          <div className="rounded-xl bg-gray-900/70 border border-gray-800 p-2.5">
            <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">Current EKG Measurements</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-mono">
              <span className="text-gray-500">PR <span className="font-bold tabular-nums" style={{ color: prColor }}>{derived.prIntervalMs ? `${Math.round(derived.prIntervalMs)}ms` : '—'}</span></span>
              <span className="text-gray-500">QRS <span className="font-bold tabular-nums" style={{ color: qrsColor }}>{derived.qrsDurationMs ? `${Math.round(derived.qrsDurationMs)}ms` : '—'}</span></span>
              <span className="text-gray-500">QT <span className="font-bold tabular-nums text-gray-300">{derived.qtIntervalMs ? `${Math.round(derived.qtIntervalMs)}ms` : '—'}</span></span>
              <span className="text-gray-500">QTc <span className="font-bold tabular-nums" style={{ color: qtcColor }}>{qtcMs ? `${qtcMs}ms` : '—'}</span></span>
              <span className="text-gray-500">Axis <span className="font-bold tabular-nums text-gray-300">{axis.angleDeg >= 0 ? '+' : ''}{axis.angleDeg.toFixed(0)}°</span></span>
            </div>
          </div>

          {/* ── Physiological interpretation banner ──────────────────────
               Mechanism first, always. Clinical name only appears below it,
               smaller — this is the one place the rhythm name shows at all. */}
          <div
            key={interp.clinicalName ?? interp.mechanismText}
            className="rounded-xl p-3 border animate-[pulse_0.6s_ease-out_1]"
            style={{ backgroundColor: bannerColor + '14', borderColor: bannerColor + '40' }}
          >
            <div className="flex items-start gap-2.5">
              <NoteChip level={interp.level} />
              <div className="min-w-0">
                <p className="text-sm text-gray-200 leading-relaxed">{interp.mechanismText}</p>
                {interp.clinicalName && (
                  <p className="text-xs font-semibold mt-1.5" style={{ color: bannerColor }}>
                    → This produces: {interp.clinicalName}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ══ RIGHT COLUMN: mean axis + physiology sections ════════════════ */}
        <div className="flex-1 min-w-0 space-y-2">

          {/* ── Mean cardiac axis — a readout, no manual override ────────── */}
          <div className="rounded-xl bg-gray-950 border border-gray-800 p-2.5">
            <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">Mean Cardiac Axis</p>
            <div className="flex gap-4 items-start flex-wrap">
              <div className="shrink-0 mx-auto">
                <EinthovenAxisTriangle angleDeg={axis.angleDeg} size={140} />
              </div>
              <div className="flex-1 min-w-[220px]">
                <AxisSummaryPanel angleDeg={axis.angleDeg} leadIMm={axis.leadIMm} leadAVFMm={axis.leadAVFMm} />
              </div>
            </div>
          </div>

          {/* ── SECTION 1: SA Node ────────────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-2.5">
            <SectionHeader
              title="SA Node — Intrinsic Pacemaker"
              description="The SA node fires spontaneously due to the funny current (If) and ICa-L. Its rate sets the baseline heart rate when conduction is intact."
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <ParamSlider
                label="SA Node Automaticity (bpm)"
                value={saAutomaticity} min={20} max={200} unit=" bpm"
                onChange={v => set('saAutomaticity', v)}
                hint="Controlled by the slope of phase 4 spontaneous depolarization. Sympathetic tone steepens the slope (faster). Vagal tone flattens it (slower)."
              />
              <div>
                <label className="text-xs text-gray-400 block mb-1">Firing Regularity</label>
                <SegBtn value={firingRegularity} onChange={v => set('firingRegularity', v)} options={[
                  { label: 'Regular',     value: 'regular'     },
                  { label: 'Respiratory', value: 'respiratory' },
                  { label: 'Irregular',   value: 'irregular'   },
                ]} />
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                  {firingRegularity === 'regular'     && 'Constant P-P interval.'}
                  {firingRegularity === 'respiratory' && 'Normal variant. Vagal tone increases on expiration, slowing the SA node. Common in young, healthy individuals and athletes — not a pathological finding.'}
                  {firingRegularity === 'irregular'   && 'SA node dysfunction — sick sinus syndrome. Rate becomes unpredictable.'}
                </p>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Atrial Myocardium ──────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-2.5">
            <SectionHeader
              title="Atrial Myocardium — Conduction & Refractoriness"
              description="Once the SA node fires, depolarization spreads through the atria. How fast it conducts and how quickly it recovers determines whether organized or chaotic atrial activity occurs."
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <ParamSlider
                label="Atrial Conduction Velocity"
                value={atrialConductionVelocityPct} min={20} max={100} unit="%"
                onChange={v => set('atrialConductionVelocityPct', v)}
                hint="Normal: ~1 m/s across the atrial wall. Slowing widens the P wave. Bachmann's bundle carries the impulse from right to left atrium."
              />
              <ParamSlider
                label="Atrial Refractory Period (ms)"
                value={atrialRefractoryMs} min={150} max={350} unit=" ms"
                color={atrialRefractoryMs < 200 ? '#ef4444' : atrialRefractoryMs < 250 ? '#f59e0b' : '#10b981'}
                onChange={v => set('atrialRefractoryMs', v)}
                hint={
                  atrialRefractoryMs < 180
                    ? 'Multiple re-entrant wavelets — organized atrial contraction is lost.'
                    : atrialRefractoryMs < 200
                    ? 'Re-entry established — a single circuit is sustaining itself. The atria are contracting 4× faster than normal.'
                    : atrialRefractoryMs < 250
                    ? 'Atrial conduction is becoming slightly erratic — P wave morphology varies.'
                    : 'How long atrial cells cannot be re-excited after firing. If the refractory period becomes shorter than the wavelength of a re-entrant impulse, organized conduction breaks down into multiple simultaneous wavelets.'
                }
              />
            </div>
          </div>

          {/* ── SECTION 3: AV Node ────────────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-2.5">
            <SectionHeader
              title="AV Node — Gatekeeper"
              description="The AV node is the only normal electrical connection between atria and ventricles. Its slow conduction velocity (0.05 m/s — 40× slower than Purkinje) creates the PR delay that allows atrial contraction to fill the ventricles before they contract."
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <ParamSlider
                label="AV Node Conduction Velocity"
                value={avConductionVelocityPct} min={0} max={100} unit="%"
                onChange={v => set('avConductionVelocityPct', v)}
                hint={
                  avConductionVelocityPct === 0
                    ? 'Complete AV block. No atrial impulse reaches the ventricles. The ventricles are now depending entirely on their own backup pacemakers.'
                    : avConductionVelocityPct <= 20
                    ? 'The AV node can no longer conduct every impulse. Some atrial beats are blocked — you will see P waves with no following QRS.'
                    : avConductionVelocityPct <= 40
                    ? 'AV node struggles with rapid impulses — some fail to conduct, especially when atrial rate is fast.'
                    : avConductionVelocityPct <= 70
                    ? 'Conduction is slowed but intact. Every atrial impulse still reaches the ventricles — just later.'
                    : 'Normal: ~0.05 m/s. The slowest conduction in the heart — this is why the PR interval exists.'
                }
              />
              <div>
                <label className="text-xs text-gray-400 block mb-1">AV Node Recovery Pattern</label>
                <SegBtn value={avRecoveryBehavior} onChange={v => set('avRecoveryBehavior', v)} options={[
                  { label: 'Uniform', value: 'uniform' },
                  { label: 'Fatigue', value: 'fatigue' },
                ]} />
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                  {avRecoveryBehavior === 'fatigue'
                    ? "With each impulse, the AV node takes slightly longer to recover. This produces progressively longer PR intervals until a beat is finally blocked — then the node resets. This is the mechanism of Wenckebach."
                    : "The AV node either conducts or it doesn't — recovery time is constant. When a beat is blocked, there is no warning. This is the mechanism of Mobitz II."}
                </p>
              </div>
              <div className="col-span-2">
                <ParamSlider
                  label="AV Node Refractory Period (ms)"
                  value={avRefractoryMs} min={200} max={500} unit=" ms"
                  disabled={isBlock}
                  onChange={v => set('avRefractoryMs', v)}
                  hint="Determines the maximum atrial rate the AV node will conduct. At flutter rates (~300 bpm), the refractory period determines how many impulses get through (2:1, 3:1, 4:1). You don't set the ratio directly — it emerges from the refractory period and the atrial rate."
                />
                {!isBlock && (
                  <div className="mt-2 rounded-lg bg-gray-900/70 border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-gray-400 leading-relaxed">
                    Atrial rate: <span className="text-gray-200">{atrialRateForCalc} bpm</span> → interval: <span className="text-gray-200">{Math.round(atrialIntervalForCalc)}ms</span>
                    <br />AV refractory period: <span className="text-gray-200">{Math.round(effectiveRefractoryForCalc)}ms</span>
                    {' → '}<span className="font-bold" style={{ color: EMERALD }}>{derived.avRatio}:{Math.max(1, derived.avRatio - 1)} conduction</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: His-Purkinje System ────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-2.5">
            <SectionHeader
              title="His-Purkinje System — Fast Conduction Network"
              description="Conducts at 2-4 m/s — 40-80× faster than the AV node. Ensures both ventricles activate nearly simultaneously, producing a narrow QRS. When a bundle branch fails, the affected ventricle must be activated slowly through muscle — widening the QRS."
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <ParamSlider
                label="Left Bundle Branch Velocity"
                value={leftBundleVelocityPct} min={0} max={100} unit="%"
                onChange={v => set('leftBundleVelocityPct', v)}
                hint={
                  leftBundleVelocityPct < 30
                    ? "Left bundle branch conduction has failed. The left ventricle is now activated late, through slow muscle-to-muscle spread rather than fast Purkinje conduction. Watch the QRS widen above 120ms."
                    : leftBundleVelocityPct < 60
                    ? 'Incomplete LBBB — QRS 100-120ms, subtle morphology change.'
                    : "Carries the impulse to the left ventricle and left side of the septum. Supplies the left anterior and posterior fascicles."
                }
              />
              <ParamSlider
                label="Right Bundle Branch Velocity"
                value={rightBundleVelocityPct} min={0} max={100} unit="%"
                onChange={v => set('rightBundleVelocityPct', v)}
                hint={
                  rightBundleVelocityPct < 30
                    ? "Right bundle branch conduction has failed. The right ventricle activates late. QRS widens, with a characteristic late rightward deflection (the 'rabbit ear')."
                    : rightBundleVelocityPct < 60
                    ? 'Incomplete RBBB — QRS 100-120ms, subtle morphology change.'
                    : 'Carries depolarization to the right ventricular myocardium and interventricular septum.'
                }
              />
              <div className="col-span-2">
                <ParamSlider
                  label="Purkinje Ectopic Automaticity (bpm)"
                  value={purkinjeAutomaticity} min={0} max={50} unit=" bpm"
                  onChange={v => set('purkinjeAutomaticity', v)}
                  hint="Purkinje cells have intrinsic automaticity at 20-40 bpm but are normally suppressed by the faster SA node (overdrive suppression). This slider controls what happens when SA node suppression is removed or AV conduction fails."
                />
                {purkinjeAutomaticity > 0 && (
                  <p className="text-xs mt-1.5 leading-snug" style={{ color: derived.escapeSource === 'purkinje' ? '#f59e0b' : '#6b7280' }}>
                    {derived.escapeSource === 'purkinje'
                      ? "The SA node's impulses are blocked at the AV node. The Purkinje system is now acting as an escape pacemaker — without it, the ventricles would not contract at all."
                      : `SA rate (${Math.round(derived.effectiveSaRate)} bpm) > Purkinje rate — SA node is suppressing this backup pacemaker through overdrive suppression. Try slowing the SA node below the Purkinje rate to see the escape rhythm emerge.`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 5: Ventricular Myocardium ─────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-2.5">
            <SectionHeader
              title="Ventricular Myocardium — Contraction & Repolarization"
              description="The working muscle of the heart. Its action potential duration determines the QT interval and the vulnerable period for re-entry. Ectopic automaticity here produces wide, bizarre beats originating outside the normal conduction system."
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <ParamSlider
                  label="Ventricular Action Potential Duration (ms)"
                  value={ventricularApdMs} min={200} max={500} unit=" ms"
                  onChange={v => set('ventricularApdMs', v)}
                  hint="Determines QT interval. Normally shortens at faster heart rates. When prolonged, the vulnerable period for re-entry widens — increasing the risk of Torsades de Pointes."
                />
                <p className="text-xs mt-0.5 leading-snug" style={{ color: qtcColor }}>
                  {!qtcMs ? '' : qtcMs > 500 ? 'High risk — Torsades threshold approached.' : qtcMs > 440 ? 'Borderline prolonged — vulnerable period widening.' : 'Within normal range.'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Repolarization Heterogeneity</label>
                <SegBtn value={repolHeterogeneity} onChange={v => set('repolHeterogeneity', v)} options={[
                  { label: 'None',     value: 'none'     },
                  { label: 'Moderate', value: 'moderate' },
                  { label: 'High',     value: 'high'     },
                ]} />
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                  {repolHeterogeneity === 'none'     && 'Uniform T wave, low arrhythmia risk.'}
                  {repolHeterogeneity === 'moderate'  && 'T wave changes, inverted or biphasic.'}
                  {repolHeterogeneity === 'high'      && 'Heterogeneous repolarization creates a re-entry substrate — some regions are excitable while adjacent regions are still refractory. Re-entrant beats begin appearing.'}
                </p>
              </div>
              <div className="col-span-2">
                <ParamSlider
                  label="Ventricular Ectopic Focus Automaticity (bpm)"
                  value={ventricularEctopicRate} min={0} max={120} unit=" bpm"
                  onChange={v => set('ventricularEctopicRate', v)}
                  hint="Ventricular muscle cells do not normally fire spontaneously — they wait for the Purkinje impulse. Ischemia, electrolyte abnormalities, and catecholamine excess can cause spontaneous depolarization in a small region of ventricular muscle, creating an ectopic focus."
                />
                {ventricularEctopicRate > 150 && derived.ectopicCapture === 'captured' && (
                  <p className="text-xs text-red-400 mt-1.5 leading-snug">
                    Sustained ventricular tachycardia — haemodynamically dangerous. At these rates, ventricular filling is severely compromised.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 6: Autonomic Nervous System (collapsed) ───────────── */}
          <CollapsibleSection
            title="Autonomic Nervous System"
            description="The autonomic nervous system modulates all the parameters above simultaneously. Rather than changing individual properties, autonomic tone shifts the entire system."
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <ParamSlider
                  label="Sympathetic (Adrenergic) Tone"
                  value={sympatheticTone} min={0} max={100} unit="%"
                  onChange={v => set('sympatheticTone', v)}
                  hint="Noradrenaline/adrenaline acts on β1 receptors. Increases If (steeper phase 4 slope in SA node), enhances ICa-L (faster AV conduction), shortens action potential duration (shorter QT)."
                />
                <p className="text-xs text-gray-600 mt-1">↑ SA automaticity | ↓ AV conduction delay | ↓ AP duration</p>
                <p className="text-xs text-gray-700 mt-0.5">Exercise, fear, pain, epinephrine, dopamine, dobutamine</p>
              </div>
              <div>
                <ParamSlider
                  label="Parasympathetic (Cholinergic) Tone"
                  value={parasympatheticTone} min={0} max={100} unit="%"
                  onChange={v => set('parasympatheticTone', v)}
                  hint="Acetylcholine acts on M2 receptors. Opens IKAch channels — hyperpolarizes SA node (slower automaticity) and slows AV node conduction (longer PR)."
                />
                <p className="text-xs text-gray-600 mt-1">↓ SA automaticity | ↑ AV conduction delay | variable AP duration</p>
                <p className="text-xs text-gray-700 mt-0.5">Sleep, vasovagal syncope, digoxin, athletic training, carotid sinus massage</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── SECTION 7: Ion Concentrations — Advanced (collapsed) ──────── */}
          <CollapsibleSection
            title="Ion Concentrations — Advanced"
            description="The resting membrane potential and action potential shape depend on the electrochemical gradients for Na+, K+, and Ca2+. Changing extracellular concentrations shifts these gradients and alters every electrical property above."
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <ParamSlider
                  label="Extracellular [K+] (mEq/L)"
                  value={potassiumMEqL} min={2.0} max={9.0} step={0.1} unit=" mEq/L"
                  color={potassiumMEqL > 7 || potassiumMEqL < 2.5 ? '#ef4444' : (potassiumMEqL > 5.5 || potassiumMEqL < 3.5) ? '#f59e0b' : '#10b981'}
                  onChange={v => set('potassiumMEqL', v)}
                  hint="K+ gradient determines resting membrane potential (Nernst equation). Low K+ hyperpolarizes cells and prolongs action potentials. High K+ depolarizes cells and slows conduction globally."
                />
                {derived.ionAlert && (
                  <p className="text-xs mt-1.5 leading-snug" style={{ color: derived.hyperkalemiaAlert ? '#ef4444' : '#f59e0b' }}>
                    {derived.hyperkalemiaAlert && '⚠ Critical hyperkalemia. '}{derived.ionAlert}
                  </p>
                )}
              </div>
              <div>
                <ParamSlider
                  label="Extracellular [Ca2+] (mg/dL)"
                  value={calciumMgDl} min={5.0} max={15.0} step={0.1} unit=" mg/dL"
                  color={calciumMgDl > 13 || calciumMgDl < 7 ? '#ef4444' : (calciumMgDl > 10.5 || calciumMgDl < 8.5) ? '#f59e0b' : '#10b981'}
                  onChange={v => set('calciumMgDl', v)}
                  hint="Ca2+ affects the threshold for action potential firing and the plateau phase duration via ICa-L. It does NOT change resting membrane potential significantly."
                />
                <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                  {calciumMgDl > 13
                    ? 'Severe hypercalcemia — abnormal notch at the J point (Osborn wave), also seen in hypothermia.'
                    : calciumMgDl > 10.5
                    ? 'Enhanced ICa-L terminates the plateau more quickly — QT shortens.'
                    : calciumMgDl < 8.5
                    ? 'ST segment lengthens because ICa-L is reduced — the plateau phase takes longer to terminate. Predisposes to Torsades.'
                    : 'Normal range: 8.5-10.5 mg/dL.'}
                </p>
              </div>
            </div>
          </CollapsibleSection>

        </div>
      </div>
    </ModulePage>
  )
}
