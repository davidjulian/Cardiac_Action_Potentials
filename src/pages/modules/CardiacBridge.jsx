import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import p5 from 'p5'
import ModulePage from '../../components/ModulePage'
import TeachingConductionAnimation from '../../components/TeachingConductionAnimation'
import TeachingAnatomyDiagram from '../../components/TeachingAnatomyDiagram'
import { getTeachingConductionStage } from '../../lib/teachingConduction'
import HeartAnimation from '../../components/HeartAnimation'
import { ECGVoltage, cycleVoltage, buildRhythmFromParams, meanQRSAxis } from '../../lib/ECGEngine'
import { AxisSummaryPanel } from '../../components/MeanAxisPanel'
import { useTabState, usePublishTabs } from '../../components/ModuleTabs'

// ── Constants ──────────────────────────────────────────────────────────────
const CYCLE_MS = 800
const DEFAULT_RHYTHM_PARAMS = {
  saNodeRate: 75, avConductionRatio: 'all', prInterval: 160,
  qrsDuration: 80, qtInterval: 380, pWaveMode: 'present', escapeRhythm: 'none',
}

// ── Anatomy data ───────────────────────────────────────────────────────────
const ANATOMY = {
  bachmann: {
    name: 'Bachmann’s bundle',
    fn: 'A broad band of atrial muscle that provides a major route for excitation from the right atrium to the left atrium.',
    electrical: 'A preferential muscular route, not an insulated wire or the only interatrial connection. Excitation also spreads through other connected atrial muscle. The band is emphasized here so it can be selected.',
  },
  atrialSeptum: {
    name: 'Atrial septal region',
    fn: 'Tissue between the separate right and left atrial blood cavities. The AV node lies in the lower right atrial septal region.',
    electrical: 'Atrial muscle conducts excitation from cell to cell through gap junctions. This simplified connected wall represents septal and nearby interatrial muscle, not a precise map of individual pathways.',
  },
  avInsulation: {
    name: 'Atrioventricular insulation',
    fn: 'The pale boundary represents fibrous tissue that electrically separates atrial and ventricular working myocardium.',
    electrical: 'Normal excitation reaches the ventricles through the AV node and penetrating His bundle, not by spreading directly across this boundary. Its continuous line is a teaching simplification, not a literal anatomical section.',
  },
  base: {
    name: 'Ventricular base',
    definition: 'The broad upper region of the ventricles, near the atria and atrioventricular valves. Here, “base” does not mean the bottom.',
    orientation: '“Toward the base” means toward the atrial end of the ventricles. The dashed guide marks an approximate level, not a precise anatomical plane.',
  },
  apex: {
    name: 'Apex',
    definition: 'The pointed lower tip of the heart, formed by the left ventricle.',
    orientation: '“Toward the apex” means toward the pointed tip. The dashed guide marks its approximate level in this schematic.',
  },
  sa: {
    name: 'SA Node (Sinoatrial Node)',
    apType: 'sa',
    fn: 'Primary pacemaker — spontaneously depolarizes 60–100 times per minute without external stimulus. Located at the junction of the superior vena cava and the right atrium.',
    electrical: 'During Phase 4, HCN channels conduct I_f and T-type calcium channels conduct I_Ca,T. The cell has no stable resting potential. L-type calcium channels conduct I_Ca,L, which drives the upstroke, rather than fast I_Na. The slope of Phase 4 helps determine heart rate.',
    ECG: 'Not directly visible on surface ECG. Its firing initiates the P wave, but the SA node signal is too small. Dysfunction manifests as sinus bradycardia, sick sinus syndrome, or sinus arrest.',
  },
  ra: {
    name: 'Right Atrium',
    apType: 'myocyte',
    fn: 'Receives deoxygenated blood from the superior and inferior vena cava and coronary sinus. Contracts to complete ventricular filling (atrial kick).',
    electrical: 'Fast-response myocytes with a prominent Phase 0 I_Na upstroke. Excitation spreads from the SA node through connected atrial muscle via gap junctions, including toward the AV node. Preferential routes do not restrict excitation to a few discrete wires.',
    ECG: 'Initial (first half) of the P wave. Right atrial enlargement prolongs or widens the early P wave. Depolarizes slightly before left atrium.',
  },
  la: {
    name: 'Left Atrium',
    apType: 'myocyte',
    fn: 'Receives oxygenated blood from four pulmonary veins. Contracts to complete left ventricular filling. Forms the posterior heart border on chest X-ray.',
    electrical: 'Excitation reaches the left atrium through muscular connections with the right atrium. Bachmann’s bundle is a major route, but not the only one. Activation of the two atria overlaps in time.',
    ECG: "Terminal (second half) of the P wave. Left atrial enlargement produces a bifid P wave (P mitrale) in lead II or negative terminal deflection in V1.",
  },
  av: {
    name: 'AV Node (Atrioventricular Node)',
    apType: 'sa',
    fn: 'Located in the lower right atrial septal region, where it receives excitation from atrial muscle. Slow conduction delays ventricular activation, allowing time for ventricular filling. The AV conduction axis continues into the His bundle, which crosses the fibrous insulation.',
    electrical: 'Slow-response cells like SA node: upstroke via I_Ca,L, no fast I_Na. Conduction velocity only 0.05 m/s — the slowest in the heart. Heavily innervated by both vagal (slows) and sympathetic (accelerates) fibers. Site of most Wenckebach and complete heart block.',
    ECG: 'Responsible for the PR interval. AV nodal delay = isoelectric PR segment. First-degree block = PR > 200 ms. Third-degree block = complete dissociation of P waves and QRS complexes.',
  },
  his: {
    name: 'Bundle of His',
    apType: 'purkinje',
    fn: 'Exits the AV node and penetrates the fibrous skeleton of the heart, dividing into left and right bundle branches. Rapid conduction ensures synchronous ventricular activation.',
    electrical: 'Purkinje-type: fast I_Na upstroke, very rapid conduction (1–2 m/s), long plateau phase. His bundle recording (catheter lab) confirms whether block is above or below the bundle.',
    ECG: 'Not directly visible. Conduction through His-Purkinje system forms the early part of the QRS complex. His-Purkinje disease → wide QRS, bundle branch blocks.',
  },
  rbundle: {
    name: 'Right Bundle Branch',
    apType: 'purkinje',
    fn: 'Carries depolarization to the right ventricular myocardium and interventricular septum (right side). Travels subendocardially along the right side of the septum.',
    electrical: 'Purkinje fiber type. Conduction 2–4 m/s. Terminates in Purkinje network. Right bundle branch is thinner and more susceptible to block than left.',
    ECG: 'Block → RBBB pattern: wide QRS (≥120 ms), rSR′ in V1 (right-ear rabbit pattern), wide S in lateral leads (I, V5, V6). Incomplete RBBB = 100–119 ms.',
  },
  lbundle: {
    name: 'Left Bundle Branch',
    apType: 'purkinje',
    fn: 'Carries depolarization to the left ventricular myocardium and septum (left side). Fans into anterior and posterior fascicles.',
    electrical: 'Purkinje fiber type. Conduction 2–4 m/s. Left bundle has two fascicles — anterior (LAD artery supply) and posterior (dual supply, more resistant to block).',
    ECG: 'Block → LBBB: wide QRS, broad notched R in lateral leads, QS in V1. Left anterior fascicular block → left axis deviation. Left posterior fascicular block → right axis deviation.',
  },
  purkinje: {
    name: 'Purkinje Fibers',
    apType: 'purkinje',
    fn: 'Terminal conduction network fanning from bundle branches into ventricular myocardium. Ensures nearly simultaneous endocardial activation across both ventricles.',
    electrical: 'Fastest conduction in heart (2–4 m/s). Longest action potential duration. Longest Phase 2 plateau. Tertiary pacemaker (20–40 bpm) if SA and AV nodes fail — escape rhythm. Susceptible to triggered activity (EADs, DADs).',
    ECG: 'No discrete surface ECG representation. Their rapid activation underlies the narrow normal QRS (< 100 ms). Block in Purkinje fan → slow myocardial spread → wide, aberrant QRS.',
  },
  rv: {
    name: 'Right Ventricle',
    apType: 'myocyte',
    fn: 'Pumps deoxygenated blood into the pulmonary circulation via the pulmonary artery at low pressure (~25 mmHg systolic). It is thin walled and crescent shaped in transverse section, wrapping anteriorly around the LV. Its narrower appearance in a longitudinal cutaway does not mean it has a smaller chamber volume; in steady state, both ventricles eject the same stroke volume.',
    electrical: 'Activated by right bundle branch via Purkinje network, endocardium to epicardium. Myocyte action potential (Phases 0–4). Thinner wall means smaller contribution to QRS than LV.',
    ECG: 'Right ventricular hypertrophy → right axis deviation, dominant R in V1 (R > S). RV infarction (often with inferior STEMI) → ST elevation in V3R–V4R.',
  },
  lv: {
    name: 'Left Ventricle',
    apType: 'myocyte',
    fn: 'Pumps oxygenated blood into the systemic circulation at high pressure (~120 mmHg systolic). Thick-walled (~1 cm), ellipsoid. Generates the largest electrical forces in the heart.',
    electrical: 'Activated by left bundle branch, endocardium to epicardium. Myocyte action potential. LV mass dominates QRS vector — explains why normal axis points leftward and inferiorly (toward LV).',
    ECG: 'LV hypertrophy → increased R in V5/V6 + deep S in V1/V2 (Sokolow-Lyon). Dominant contributor to QRS amplitude. Lateral STEMI = LV territory (LAD / circumflex).',
  },
  septum: {
    name: 'Interventricular Septum',
    apType: 'myocyte',
    fn: 'Muscular wall separating right and left ventricles. Depolarizes from left-to-right first, creating the initial septal q waves in lateral leads. Shares mechanical load with both ventricles.',
    electrical: 'Left-to-right initial depolarization (LBB activates septum first). This produces small q waves in I, aVL, V5, V6 — normal narrow septal q waves. In LBBB, septum depolarizes right-to-left, eliminating normal septal q.',
    ECG: 'Septal q waves (narrow < 40 ms) in lateral leads are normal. Loss of septal q in lateral leads suggests LBBB. Septal hypertrophy in HCM → dynamic LVOT obstruction, asymmetric septal thickening.',
  },
}

// ── AP waveform arrays ─────────────────────────────────────────────────────
const SA_AP = [
  [0.00,-62],[0.08,-61],[0.16,-60],[0.24,-58],[0.32,-56],
  [0.40,-53],[0.48,-50],[0.56,-47],[0.63,-44],[0.68,-40],
  [0.72,-22],[0.74,-4],[0.76,10],[0.77,16],
  [0.79,13],[0.82,5],[0.86,-12],[0.90,-36],[0.94,-55],[0.97,-61],[1.00,-62],
]
const MYO_AP = [
  [0.00,-90],[0.05,-90],[0.10,-90],[0.15,-90],[0.18,-90],
  [0.182,-88],[0.187,-55],[0.192,5],[0.197,28],[0.202,30],
  [0.207,24],[0.216,12],
  [0.225,9],[0.280,7],[0.340,5],[0.400,3],[0.460,1],[0.475,0],
  [0.490,-8],[0.508,-25],[0.525,-55],[0.542,-80],[0.558,-89],[0.575,-90],
  [0.62,-90],[0.72,-90],[0.82,-90],[0.92,-90],[1.00,-90],
]
const PK_AP = [
  [0.00,-92],[0.05,-92],[0.10,-91],[0.16,-91],[0.18,-90],
  [0.182,-88],[0.185,-48],[0.188,12],[0.192,34],[0.198,38],
  [0.203,30],[0.215,15],
  [0.225,12],[0.280,10],[0.340,8],[0.400,5],[0.460,3],[0.520,1],[0.540,0],
  [0.558,-8],[0.578,-26],[0.605,-60],[0.635,-82],[0.665,-91],[0.690,-92],
  [0.73,-92],[0.80,-92],[0.87,-91],[0.94,-91],[1.00,-92],
]

// ── Phase ion-channel data ─────────────────────────────────────────────────
const SA_PHASES = [
  {
    id: 'p4', label: 'Phase 4 — Pacemaker Potential', tRange: [0, 0.68],
    channels: 'I_f (HCN channels) + I_Ca,T',
    ions: 'Na⁺ and K⁺ slowly enter via I_f ("funny" current); Ca²⁺ enters via T-type channels → gradual depolarization −62→−40 mV. No stable resting potential. Slope of this ramp sets heart rate. Sympathetic ↑ slope (faster); vagal ↓ slope (slower).',
  },
  {
    id: 'p0', label: 'Upstroke (I_Ca,L driven)', tRange: [0.68, 0.78],
    channels: 'I_Ca,L — NO fast I_Na',
    ions: 'Ca²⁺ in via L-type channels → slow, rounded upstroke to ~+16 mV. Much slower than ventricular upstroke (no I_Na). This makes SA node conduction inherently slow.',
  },
  {
    id: 'repol', label: 'Repolarization', tRange: [0.78, 1.0],
    channels: 'I_K (delayed rectifier) + I_K,ACh',
    ions: 'K⁺ exits via delayed rectifiers and acetylcholine-gated channels. Membrane returns to −62 mV to begin next pacemaker cycle. I_K,ACh allows vagal input to hyperpolarize and slow pacemaking.',
  },
]
const MYO_PHASES = [
  {
    id: 'p4r', label: 'Phase 4 — Resting Potential', tRange: [0, 0.182],
    channels: 'I_K1 (inward rectifier)',
    ions: 'K⁺ outward via I_K1 → stable resting potential of −90 mV. Stable until external depolarization (from Purkinje fibers or adjacent myocytes).',
  },
  {
    id: 'p0', label: 'Phase 0 — Fast Upstroke', tRange: [0.182, 0.207],
    channels: 'I_Na (fast voltage-gated Na⁺)',
    ions: 'Na⁺ rushes in through fast channels → −90→+30 mV in ~1–2 ms. Largest and fastest current. Threshold ~−65 mV. Rate of rise (dV/dt max) determines conduction velocity.',
  },
  {
    id: 'p1', label: 'Phase 1 — Early Repolarization', tRange: [0.207, 0.225],
    channels: 'I_to (transient outward K⁺)',
    ions: 'K⁺ briefly exits via I_to → creates "notch" between upstroke and plateau. More prominent in epicardium than endocardium → transmural voltage gradient contributes to T wave polarity.',
  },
  {
    id: 'p2', label: 'Phase 2 — Plateau', tRange: [0.225, 0.480],
    channels: 'I_Ca,L (in) balanced vs I_Kr + I_Ks (out)',
    ions: 'Ca²⁺ in BALANCED by K⁺ out → plateau ~0–10 mV for ~200 ms. Ca²⁺ influx triggers Ca²⁺-induced Ca²⁺ release (CICR) from SR → contraction. Plateau prevents re-excitation (refractory period = mechanical protection).',
  },
  {
    id: 'p3', label: 'Phase 3 — Rapid Repolarization', tRange: [0.480, 0.580],
    channels: 'I_Kr + I_Ks (rapid + slow delayed rectifiers)',
    ions: 'I_Ca,L inactivates; I_Kr/I_Ks dominate → K⁺ exits rapidly → rapid return to −90 mV. hERG (Kv11.1) channels are major molecular contributors to I_Kr and are targets of many drugs that can prolong QT.',
  },
  {
    id: 'p4d', label: 'Phase 4 — Electrical Diastole', tRange: [0.580, 1.0],
    channels: 'I_K1 (inward rectifier)',
    ions: 'I_K1 maintains stable −90 mV. No spontaneous depolarization (unlike SA node) — requires external stimulus to fire again.',
  },
]
const PK_PHASES = [
  {
    id: 'p4r', label: 'Phase 4 — Resting / Pacemaker', tRange: [0, 0.182],
    channels: 'I_K1 + slow I_f',
    ions: 'Normally I_K1 holds −92 mV. If SA/AV fail, slow I_f activates → spontaneous depolarization at 20–40 bpm (escape rhythm). Most negative resting potential in heart.',
  },
  {
    id: 'p0', label: 'Phase 0 — Fastest Upstroke', tRange: [0.182, 0.203],
    channels: 'I_Na (fast) — highest dV/dt in heart',
    ions: 'Na⁺ rushes in → fastest dV/dt of any cardiac cell (~900 V/s). −92→+38 mV. Enables extremely fast conduction (2–4 m/s) to activate ventricles nearly simultaneously.',
  },
  {
    id: 'p1', label: 'Phase 1 — Early Repolarization', tRange: [0.203, 0.225],
    channels: 'I_to',
    ions: 'K⁺ briefly exits via transient outward → notch. Similar to myocyte but slightly more pronounced.',
  },
  {
    id: 'p2', label: 'Phase 2 — Longest Plateau', tRange: [0.225, 0.540],
    channels: 'I_Ca,L vs I_Kr + I_Ks',
    ions: 'Longest plateau of any cardiac cell (~300 ms). I_Ca,L inward current is balanced by K⁺ outward current. Extended refractory period → protects against rapid ventricular rates. EADs and DADs most common here.',
  },
  {
    id: 'p3', label: 'Phase 3 — Rapid Repolarization', tRange: [0.540, 0.690],
    channels: 'I_Kr + I_Ks dominant',
    ions: 'Rapid return to −92 mV as I_Kr/I_Ks dominate. Longest AP duration → last to repolarize → determines QT interval in part.',
  },
  {
    id: 'p4d', label: 'Phase 4 — Electrical Diastole', tRange: [0.690, 1.0],
    channels: 'I_K1 (± slow I_f)',
    ions: 'I_K1 stabilizes at −92 mV. Latent automaticity: slow I_f may gradually depolarize if dominant pacemakers fail. Site of DAD-triggered arrhythmias (digitalis toxicity, Ca²⁺ overload).',
  },
]

// ── AP data for 2C (Intracellular vs ECG) ──────────────────────────────────
// Atrial myocyte: fast sodium upstroke like MYO_AP, but a much briefer plateau
// and faster repolarization (real atrial APD ≈ 150-200 ms vs ventricular
// ≈ 300 ms) — the key shape difference the spec asks students to notice.
const ATRIAL_AP = [
  [0.00,-80],[0.05,-80],[0.10,-80],[0.15,-80],[0.18,-80],
  [0.182,-78],[0.187,-45],[0.192,10],[0.197,22],[0.202,20],
  [0.207,14],[0.216,6],
  [0.225,2],[0.26,-2],[0.30,-12],[0.34,-32],[0.38,-58],[0.42,-76],[0.45,-80],
  [0.50,-80],[0.60,-80],[0.75,-80],[0.90,-80],[1.00,-80],
]
const ATRIAL_PHASES = [
  { id: 'p4r', label: 'Phase 4 — Resting Potential', tRange: [0, 0.182],
    channels: 'I_K1', ions: 'Stable resting potential ≈ −80 mV — slightly less negative than ventricular myocardium.' },
  { id: 'p0', label: 'Phase 0 — Fast Upstroke', tRange: [0.182, 0.207],
    channels: 'I_Na (fast voltage gated Na⁺ channels)', ions: 'Fast Na⁺ driven upstroke, same mechanism as ventricle, smaller amplitude.' },
  { id: 'p1', label: 'Phase 1 — Early Repolarization', tRange: [0.207, 0.225],
    channels: 'I_to', ions: 'Brief transient outward K⁺ notch.' },
  { id: 'p2', label: 'Phase 2 — Brief Plateau', tRange: [0.225, 0.34],
    channels: 'I_Ca,L vs I_Kr + I_Ks', ions: 'Much shorter plateau than ventricular myocardium → shorter refractory period → atria can be driven at much faster rates (flutter, fibrillation).' },
  { id: 'p3', label: 'Phase 3 — Rapid Repolarization', tRange: [0.34, 0.45],
    channels: 'I_Kr + I_Ks', ions: 'Rapid return to resting potential.' },
  { id: 'p4d', label: 'Phase 4 — Electrical Diastole', tRange: [0.45, 1.0],
    channels: 'I_K1', ions: 'Stable at rest until the next wavefront arrives.' },
]

// Where each region's own upstroke lands on the SHARED real-time axis this
// beat uses (t=0 → P wave onset). QRS_ONSET_MS ties the ventricle/Purkinje
// anchors to the same PR interval the module's fixed default rhythm uses,
// so "R-wave peak lands in the ventricular plateau" is true by construction,
// not by coincidence — see ECGVsAPSection's "Zoom to QRS" feature below.
const QRS_ONSET_MS = DEFAULT_RHYTHM_PARAMS.prInterval

// HeartAnimation's ventricular chamber-fill animation (rhythmId
// "normalSinusVoltage") deliberately lags the true Q/R/S timing by this
// much — it waits for the His-bundle sweep to visually finish first before
// the chambers start filling (see buildConductionMap's normalSinusVoltage
// case: ventDelay = hisBottomMs - qOnMs + 20, a constant 40ms for this
// preset's fixed His-entry duration). That's a fine cosmetic choice for the
// animation on its own — and 1C's Conduction Animation still uses it
// unmodified — but here the AP graph and ECG trace are shifted to match it
// instead, so what the animation visually shows and what these graphs show
// agree on the same instant, rather than the graphs "leading" the animation.
const VENTRICULAR_ANIM_DELAY_MS = 40

const AP_REGIONS = [
  { key: 'sa', label: 'SA Node', data: SA_AP, phases: SA_PHASES, anchorFraction: 0.68, targetMs: 0,
    desc: 'Slow spontaneous pacemaker potential (I_f + I_Ca,L). Threshold ≈ −40 mV. No fast upstroke — this cell drives its own rate.' },
  { key: 'atrium', label: 'Atrium', data: ATRIAL_AP, phases: ATRIAL_PHASES, anchorFraction: 0.182, targetMs: 10,
    desc: 'Fast upstroke (I_Na), brief plateau, rapid repolarization.' },
  { key: 'av', label: 'AV Node', data: SA_AP, phases: SA_PHASES, anchorFraction: 0.68, targetMs: Math.round(QRS_ONSET_MS * 0.72),
    desc: 'Slow response cell like the SA node — I_Ca,L upstroke, no fast I_Na — but fires midway through the PR segment, imposing the AV delay.' },
  { key: 'ventricle', label: 'Ventricle', data: MYO_AP, phases: MYO_PHASES, anchorFraction: 0.182, targetMs: QRS_ONSET_MS + VENTRICULAR_ANIM_DELAY_MS,
    desc: 'Fast upstroke (Phase 0), long plateau (Phase 2, I_Ca,L), Phases 0–4 labeled below.' },
  { key: 'purkinje', label: 'Purkinje', data: PK_AP, phases: PK_PHASES, anchorFraction: 0.182, targetMs: QRS_ONSET_MS + VENTRICULAR_ANIM_DELAY_MS - 15,
    desc: 'Fastest upstroke and longest plateau of any cardiac cell — fires just ahead of ventricular myocardium.' },
]

// Piecewise-linear lookup into an AP data array at a cyclic fraction (data
// arrays already close the loop: value at fraction 1.00 matches fraction 0.00).
function interpAP(data, fraction) {
  const f = ((fraction % 1) + 1) % 1
  for (let i = 0; i < data.length - 1; i++) {
    const [t0, v0] = data[i]
    const [t1, v1] = data[i + 1]
    if (f >= t0 && f <= t1) {
      const frac = t1 === t0 ? 0 : (f - t0) / (t1 - t0)
      return v0 + (v1 - v0) * frac
    }
  }
  return data[data.length - 1][1]
}

// Converts a region's fraction-domain phase table into real-ms shaded bands
// for TraceCanvas, using the same anchor/target mapping apValueAt() uses.
function phasesToMarkers(phases, anchorFraction, targetMs, cycleMs) {
  const toMs = (f) => targetMs + (f - anchorFraction) * cycleMs
  return phases.map(ph => {
    const [f0, f1] = ph.tRange
    const col = AP_PHASE_COLORS[ph.id] || [100, 100, 100, 25]
    return { x0: toMs(f0), x1: toMs(f1), color: `rgba(${col[0]},${col[1]},${col[2]},${(col[3] / 255).toFixed(2)})` }
  })
}

// ── Structure lookup tables (for 2C) ──────────────────────────────────────
const STRUCT_NAMES = {
  sa: 'SA Node', ra: 'Right Atrium', la: 'Left Atrium',
  bachmann: "Bachmann's Bundle", av: 'AV Node',
  his: 'Bundle of His', rbundle: 'Right Bundle Branch', lbundle: 'Left Bundle Branch',
  rv: 'Right Ventricle', lv: 'Left Ventricle', apex: 'Apex / Purkinje Fan',
  repolLV: 'LV Repolarization', repolRV: 'RV Repolarization',
}
const STRUCT_CV = {
  sa: '—', bachmann: '1.0 m/s', ra: '1.0 m/s', la: '1.0 m/s',
  av: '0.05 m/s', his: '1.0 m/s', rbundle: '2–4 m/s', lbundle: '2–4 m/s',
  rv: '0.3–0.5 m/s', lv: '0.3–0.5 m/s', apex: '0.3–0.5 m/s',
  repolLV: '—', repolRV: '—',
}
const STRUCT_NOTE = {
  sa: 'SA node fires spontaneously as I_f, conducted through HCN channels, helps drive Phase 4. Rate is governed by the slope of the pacemaker potential. Not visible on surface ECG directly.',
  ra: 'Atrial myocardium conducting at ~1 m/s. Right atrium activates first → initial P wave.',
  la: "Left atrium activates via Bachmann's bundle. Terminal P wave. Enlargement → P mitrale.",
  bachmann: "Interatrial conduction pathway connecting RA to LA at ~1 m/s. Failure → ectopic atrial rhythms.",
  av: 'AV node delay (0.05 m/s) = PR segment on ECG. Critical for ventricular filling before systole.',
  his: 'Bundle of His conducts at ~1 m/s — transitional speed before Purkinje acceleration.',
  rbundle: 'Rapid Purkinje conduction to RV endocardium (2–4 m/s). Block → RBBB pattern.',
  lbundle: 'Rapid Purkinje conduction to LV endocardium and septum (2–4 m/s). Block → LBBB pattern.',
  rv: 'RV myocardium activates endocardium → epicardium at 0.3–0.5 m/s. Thin wall, lower contribution to QRS.',
  lv: 'LV myocardium dominates QRS. Thick wall activation endocardium → epicardium. Lateral + inferior forces.',
  apex: 'Purkinje fan delivers nearly simultaneous endocardial activation across ventricular apex.',
  repolLV: 'Ventricular repolarization (T wave). Travels epicardium → endocardium (opposite to depolarization) → same T wave polarity as QRS in most leads.',
  repolRV: 'RV repolarization contributes to early T wave. Smaller contribution than LV.',
}

// ── Layout helpers ─────────────────────────────────────────────────────────
function CanvasWrap({ containerRef, children }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 mb-4">
      <div ref={containerRef} />
      {children}
    </div>
  )
}
function SimBar({ children }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900/80 border-t border-gray-800 text-sm text-gray-300 flex-wrap">
      {children}
    </div>
  )
}
function Section({ label, title, subtitle, children }) {
  return (
    <div className="mb-2">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">{label}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-gray-300 mb-2 leading-snug">{subtitle}</p>}
      {children}
    </div>
  )
}
function Callout({ children }) {
  return (
    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/30 text-xs text-cyan-300 leading-snug">
      {children}
    </div>
  )
}
function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2 text-xs leading-relaxed mb-1.5">
      <span className="text-gray-300 font-semibold shrink-0 w-32">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  )
}

// ── 1A: Heart Anatomy Overview ─────────────────────────────────────────────
function AnatomyDiagram({ selected, onSelect }) {
  const [hovered, setHovered] = useState(null)
  const active = hovered || selected

  const ev = (key) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
    onClick: () => onSelect(prev => prev === key ? null : key),
    style: { cursor: 'pointer' },
  })

  const fill = (key, base, highlight) => {
    if (active === key) return highlight
    return base
  }

  const info = active ? ANATOMY[active] : null

  return (
    <div className="flex flex-col gap-4 items-stretch xl:flex-row xl:items-start">
      <TeachingAnatomyDiagram active={active} onSelect={onSelect} onHover={setHovered} />
      {/* SVG Heart */}
      <div className="hidden" aria-hidden="true">
        <svg viewBox="0 0 200 262" width="240" height="314" className="block">
          {/* ── Non-interactive structure labels ── */}
          <text x="100" y="8" textAnchor="middle" fill="#cbd5e1" fontSize="7">Patient's Right ← → Patient's Left</text>

          {/* Bachmann's bundle (non-interactive, dashed) */}
          <path d="M 76 22 Q 100 20 124 28" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="2,2" />
          <text x="100" y="18" textAnchor="middle" fill="#cbd5e1" fontSize="7">Bachmann's bundle</text>

          {/* ── Right Atrium (viewer left = patient right) ── */}
          <path
            d="M 62 42 Q 62 28 80 26 Q 98 24 98 42 Q 98 75 70 88 Q 58 80 58 65 Z"
            fill={fill('ra', '#1e3a2e', '#166534')}
            stroke={active === 'ra' ? '#4ade80' : '#374151'}
            strokeWidth="1.5"
            {...ev('ra')}
          />
          <text x="76" y="60" textAnchor="middle" fill="#d1fae5" fontSize="9" fontWeight="600" pointerEvents="none">RA</text>

          {/* ── Left Atrium (viewer right = patient left) ── */}
          <path
            d="M 102 42 Q 102 24 120 26 Q 138 28 138 42 Q 138 65 130 80 Q 118 88 102 75 Z"
            fill={fill('la', '#1e3a2e', '#166534')}
            stroke={active === 'la' ? '#4ade80' : '#374151'}
            strokeWidth="1.5"
            {...ev('la')}
          />
          <text x="120" y="60" textAnchor="middle" fill="#d1fae5" fontSize="9" fontWeight="600" pointerEvents="none">LA</text>

          {/* ── SA Node (viewer left, patient right) ── */}
          <circle
            cx="70" cy="18" r="7"
            fill={fill('sa', '#1e2a4e', '#1d4ed8')}
            stroke={active === 'sa' ? '#60a5fa' : '#374151'}
            strokeWidth="1.5"
            {...ev('sa')}
          />
          <text x="70" y="20" textAnchor="middle" fill="#dbeafe" fontSize="7" fontWeight="600" pointerEvents="none">SA</text>

          {/* ── AV Node ── */}
          <circle
            cx="100" cy="97" r="7"
            fill={fill('av', '#2d1a4e', '#6d28d9')}
            stroke={active === 'av' ? '#a78bfa' : '#374151'}
            strokeWidth="1.5"
            {...ev('av')}
          />
          <text x="100" y="99" textAnchor="middle" fill="#f5f3ff" fontSize="7" fontWeight="600" pointerEvents="none">AV</text>

          {/* ── Bundle of His ── */}
          <line x1="100" y1="104" x2="100" y2="117"
            stroke={active === 'his' ? '#c084fc' : '#6b7280'} strokeWidth="2.5"
            {...ev('his')} style={{ cursor: 'pointer' }}
          />
          <rect x="88" y="104" width="24" height="13" fill="transparent" {...ev('his')} />
          <text x="113" y="113" fill="#e5e7eb" fontSize="7" fontWeight="600" pointerEvents="none">His</text>

          {/* ── Right Bundle Branch (viewer left) ── */}
          <path
            d="M 97 119 Q 80 130 65 148 Q 58 158 62 170"
            fill="none"
            stroke={fill('rbundle', '#4b5563', '#db2777')}
            strokeWidth="2"
            {...ev('rbundle')} style={{ cursor: 'pointer' }}
          />
          <text x="54" y="138" fill="#e5e7eb" fontSize="7" fontWeight="600" pointerEvents="none">RBB</text>

          {/* ── Left Bundle Branch (viewer right) ── */}
          <path
            d="M 103 119 Q 120 130 135 148 Q 142 158 138 170"
            fill="none"
            stroke={fill('lbundle', '#4b5563', '#db2777')}
            strokeWidth="2"
            {...ev('lbundle')} style={{ cursor: 'pointer' }}
          />
          <text x="136" y="138" fill="#e5e7eb" fontSize="7" fontWeight="600" pointerEvents="none">LBB</text>

          {/* ── Purkinje fan hints (apex region) ── */}
          <path d="M 62 170 Q 70 195 85 210 Q 95 222 100 228"
            fill="none" stroke="#4b5563" strokeWidth="1" strokeDasharray="1.5,1.5"
            {...ev('purkinje')} style={{ cursor: 'pointer' }}
          />
          <path d="M 138 170 Q 130 195 115 210 Q 105 222 100 228"
            fill="none" stroke="#4b5563" strokeWidth="1" strokeDasharray="1.5,1.5"
            {...ev('purkinje')} style={{ cursor: 'pointer' }}
          />
          <text x="100" y="240" textAnchor="middle" fill="#e5e7eb" fontSize="7" fontWeight="600" pointerEvents="none">Purkinje</text>

          {/* ── Right Ventricle (viewer left) ── */}
          <path
            d="M 58 95 Q 42 110 40 140 Q 38 170 60 190 Q 80 210 100 228 Q 98 200 95 175 Q 90 148 88 125 Q 80 105 70 97 Z"
            fill={fill('rv', '#1f2937', '#7c2d12')}
            stroke={active === 'rv' ? '#fb923c' : '#374151'}
            strokeWidth="1.5"
            {...ev('rv')}
          />
          <text x="64" y="168" textAnchor="middle" fill="#ffedd5" fontSize="9" fontWeight="600" pointerEvents="none">RV</text>

          {/* ── Left Ventricle (viewer right) ── */}
          <path
            d="M 142 95 Q 158 110 160 140 Q 162 170 140 190 Q 120 210 100 228 Q 102 200 105 175 Q 110 148 112 125 Q 120 105 130 97 Z"
            fill={fill('lv', '#1f2937', '#7c2d12')}
            stroke={active === 'lv' ? '#fb923c' : '#374151'}
            strokeWidth="1.5"
            {...ev('lv')}
          />
          <text x="136" y="168" textAnchor="middle" fill="#ffedd5" fontSize="9" fontWeight="600" pointerEvents="none">LV</text>

          {/* ── Interventricular Septum ── */}
          <path
            d="M 88 125 Q 92 148 95 175 Q 97 200 100 228 Q 103 200 105 175 Q 108 148 112 125 Q 105 110 100 107 Q 95 110 88 125 Z"
            fill={fill('septum', '#111827', '#1e3a5f')}
            stroke={active === 'septum' ? '#38bdf8' : '#374151'}
            strokeWidth="1"
            {...ev('septum')}
          />
          <text x="100" y="165" textAnchor="middle" fill="#bae6fd" fontSize="6.5" fontWeight="600" pointerEvents="none">IVS</text>
        </svg>
      </div>

      {/* Info panel */}
      <div className="flex-1 min-h-[262px] flex flex-col justify-start">
        {info ? (
          <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 h-full">
            <h3 className="text-sm font-semibold text-white mb-3">{info.name}</h3>
            {info.definition ? (
              <>
                <InfoRow label="Location" value={info.definition} />
                <InfoRow label="Directional reference" value={info.orientation} />
              </>
            ) : (
              <>
                <InfoRow label="Primary function" value={info.fn} />
                <InfoRow label="Electrical role" value={info.electrical} />
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 h-full flex flex-col justify-center text-center">
            <p className="text-gray-100 text-base font-semibold">Hover or click a structure</p>
            <p className="text-gray-300 text-sm mt-2 leading-relaxed">SA Node · RA · LA · Bachmann’s bundle · Atrial septal region · AV Node · AV insulation · Bundle of His · Bundle Branches · Purkinje · RV · LV · Ventricular septum · Ventricular base · Apex</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 1B: Action Potentials by Cell Type ────────────────────────────────────
const AP_VMIN = -100, AP_VMAX = 45

// Stable array references for TraceCanvas's yDomain prop — ECGVsAPSection
// re-renders every animation frame (its clock's tMs state ticks ~60/s), so
// an inline array literal here would give TraceCanvas a new reference each
// frame and force its draw-loop effect to tear down and restart constantly,
// which is what caused the visible flashing.
const AP_Y_DOMAIN = [AP_VMIN, AP_VMAX]
const ECG_Y_DOMAIN = [0, 1.5]
const CALCIUM_Y_DOMAIN = [0, 1.8]
const FORCE_Y_DOMAIN = [0, 1.2]
const AP_PHASE_COLORS = {
  p4:    [59,  130, 246, 40],
  p0:    [239, 68,  68,  50],
  p1:    [234, 179, 8,   45],
  p2:    [16,  185, 129, 40],
  p3:    [168, 85,  247, 40],
  p4r:   [59,  130, 246, 40],
  p4d:   [59,  130, 246, 40],
  repol: [168, 85,  247, 40],
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function smooth01(t) { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c) }

// ── Physiology model ────────────────────────────────────────────────────
// Deliberately simple, monotonic formulas anchored to the exact before/after
// numbers called out in the teaching spec (e.g. SA max diastolic potential
// −60→−55 mV at 100% sympathetic tone) rather than a full ionic model — this
// drives a teaching visualization, not a research simulation.
const BASE_SA_RATE = 75 // bpm, at the 20%/20% ANS default

function computeAPPhysiology({ sympathetic, parasympathetic, kMEqL, caMgDl }) {
  const symp = sympathetic / 100
  const para = parasympathetic / 100
  const kDev  = kMEqL - 4.0   // deviation from normal extracellular K+
  const caDev = caMgDl - 9.5  // deviation from normal extracellular Ca2+

  // ── Shared cycle length — the SA node's own rate paces every panel ──
  let saRate = BASE_SA_RATE * (1 + 0.9 * symp - 0.75 * para)
  if (kMEqL < 3.5) saRate *= 1 + 0.08 * (3.5 - kMEqL) // paradoxical low-K+ automaticity increase
  saRate = clamp(saRate, 25, 220)
  const cycleMs = 60000 / saRate

  // ── SA node shape ──
  const saKShift = kDev >= 0 ? 3.0 * kDev : 1.5 * kDev
  const sa = {
    mdp: clamp(-60 + 5 * symp - 10 * para + saKShift, -78, -45),
    phase4Frac: clamp(0.68 - 0.24 * symp + 0.14 * para, 0.34, 0.86),
    threshold: -40,
  }

  // AV nodal cells are also slow-response cells, but the normal atrial
  // impulse activates them before their slower latent pacemaker drift reaches
  // threshold. Autonomic tone changes nodal membrane behavior directly; it
  // does not silently alter the extracellular ion controls.
  const av = {
    mdp: clamp(-64 + 3 * symp - 8 * para + saKShift, -78, -48),
    phase4Frac: clamp(0.84 - 0.06 * symp + 0.08 * para, 0.70, 0.92),
    threshold: -40,
  }

  // ── Ventricular / Purkinje shared K+ / Ca2+ / sympathetic effects ──
  const restingMv = kDev >= 0
    ? clamp(-90 + 7 * kDev, -90, -45)
    : clamp(-90 + 3 * kDev, -100, -90)
  const upstrokePeak = clamp(30 - 3 * Math.max(0, kDev), 5, 30)
  const upstrokeSlowFactor = 1 + 0.7 * Math.max(0, kDev) / 5
  const plateauScale = clamp(1 - 0.021 * caDev, 0.42, 1.9) * (1 - 0.15 * symp)
  const repolSlowFactor = kMEqL < 3.5 ? 1 + 0.6 * (3.5 - kMEqL) : 1
  const uWaveMv = kMEqL < 3.5 ? clamp((3.5 - kMEqL) * 4, 0, 15) : 0
  const cellShared = { restingMv, upstrokePeak, upstrokeSlowFactor, plateauScale, repolSlowFactor, uWaveMv }

  // ── AV conduction delay (parasympathetic lengthens it) ──
  const avDelayMs = Math.round(clamp(140 * (1 + 0.9 * para - 0.25 * symp), 80, 500))

  return {
    symp, para, kMEqL, caMgDl, cycleMs, saRate, avDelayMs,
    sa, av,
    atrium: cellShared,
    ventricle: cellShared,
    purkinje: cellShared,
    bothElevated: symp >= 0.5 && para >= 0.5,
  }
}

const BASELINE_AP_PHYSIOLOGY = computeAPPhysiology({
  sympathetic: 20,
  parasympathetic: 20,
  kMEqL: 4.0,
  caMgDl: 9.5,
})

// ── Parametric AP shape generators — sampled fresh whenever physiology
// changes, reusing interpAP()'s fraction-space lookup convention so these
// plug straight into TraceCanvas the same way the static 2C arrays do. ──
//
// Slow response waves can be placed anywhere in the shared cycle. The SA
// node fires at t≈0; the AV node is triggered shortly after atrial activation.
// Their Phase 4 drift wraps across the end of the displayed cycle and builds
// back toward the next activation.
function splitPhaseWindow(lo, hi) {
  const start = ((lo % 1) + 1) % 1
  const duration = hi - lo
  const end = start + duration
  return end <= 1 ? [[start, end]] : [[start, 1], [0, end - 1]]
}

function buildSlowResponseWave({ mdp, phase4Frac, threshold }, { n = 60, fireAtFrac = 0, tissue = 'sa' } = {}) {
  const peak = 15
  const upDur = clamp(0.10, 0.04, 0.94 - phase4Frac) // upstroke+repol duration, unrotated
  const p0End = phase4Frac + upDur
  // Rotated-space breakpoints: upstroke [0, upEndR], repol [upEndR, repolEndR], phase4 [repolEndR, 1]
  const upEndR    = p0End - phase4Frac
  const repolEndR = 1 - phase4Frac

  const data = []
  for (let i = 0; i <= n; i++) {
    const tR = i / n
    const t = ((tR - fireAtFrac + phase4Frac) % 1 + 1) % 1
    let v
    if (t <= phase4Frac) {
      const f = phase4Frac === 0 ? 1 : t / phase4Frac
      // The drift begins immediately after repolarization, with additional
      // acceleration as threshold approaches.
      v = mdp + (threshold - mdp) * (0.4 * f + 0.6 * f * f)
    } else if (t <= p0End) {
      v = threshold + (peak - threshold) * smooth01((t - phase4Frac) / (p0End - phase4Frac))
    } else {
      v = peak + (mdp - peak) * smooth01((t - p0End) / (1 - p0End))
    }
    data.push([tR, Math.round(v * 10) / 10])
  }
  const phaseDefs = [
    { id: 'p0', label: 'Upstroke — I_Ca,L driven', bounds: [0, upEndR],
      channels: 'I_Ca,L — NO fast I_Na', short: tissue === 'av'
        ? 'Atrial input triggers the AV node — I_Ca,L carries the slow Phase 0 current'
        : 'SA fires first — I_Ca,L opens. No fast I_Na — explains the slow upstroke',
      ions: 'Ca²⁺ in via L-type channels → slow, rounded upstroke. Much slower than ventricular upstroke since there is no fast I_Na here.' },
    { id: 'repol', label: 'Repolarization', bounds: [upEndR, repolEndR],
      channels: 'I_K (delayed rectifier) + I_K,ACh', short: 'Repolarization — I_K + I_K,ACh',
      ions: 'K⁺ exits via delayed rectifiers and ACh-gated channels, returning toward the pacemaker potential.' },
    { id: 'p4', label: 'Phase 4 — Pacemaker Potential', bounds: [repolEndR, 1],
      channels: 'I_f through HCN channels + I_Ca,T', short: tissue === 'av'
        ? 'Latent pacemaker drift continues, but the next atrial impulse normally arrives first'
        : 'Phase 4 — I_f through HCN channels helps build toward the next beat',
      ions: tissue === 'av'
        ? 'HCN and T-type calcium channels support latent automaticity. During normal sinus rhythm, atrial excitation triggers the next AV nodal action potential before this drift reaches threshold.'
        : 'Mixed cations carry I_f through HCN channels; Ca²⁺ enters through T-type channels as threshold approaches. The Phase 4 slope helps set heart rate.' },
  ]
  const phases = phaseDefs.flatMap(({ bounds: [lo, hi], ...phase }) =>
    splitPhaseWindow(lo + fireAtFrac, hi + fireAtFrac).map(tRange => ({ ...phase, tRange }))
  )
  return { data, phases }
}

// kind: 'ventricle' | 'purkinje' | 'atrium'. The displayed working-cell
// upstrokes follow the physiological sequence: atrial myocardium first,
// then Purkinje fibers after the AV/His/bundle pathway, then ventricular
// myocardium. Intermediate conduction tissues are named in the pathway
// ribbon rather than given redundant traces.
function buildWorkingCellWave({ restingMv, upstrokePeak, upstrokeSlowFactor, plateauScale, repolSlowFactor, uWaveMv }, kind, n = 100, p0StartOverride = null) {
  const isPurkinje = kind === 'purkinje'
  const isAtrium   = kind === 'atrium'
  const cellRestingMv = isAtrium ? clamp(restingMv + 10, -100, -45) : restingMv // atrium's baseline is less negative (~ -80 vs -90)
  const notchMv = cellRestingMv + (upstrokePeak - cellRestingMv) * 0.55
  const plateauMv = isPurkinje ? 4 : isAtrium ? 0 : 2
  const p0Start = p0StartOverride ?? (isAtrium ? 0.05 : isPurkinje ? 0.165 : 0.195)
  const p0End = p0Start + (isPurkinje ? 0.021 : isAtrium ? 0.020 : 0.025) * upstrokeSlowFactor
  const p1End = p0End + 0.020
  const basePlateauDur = isPurkinje ? 0.315 : isAtrium ? 0.13 : 0.255
  const p2End = p1End + basePlateauDur * plateauScale
  const p3Dur = (isPurkinje ? 0.15 : isAtrium ? 0.09 : 0.10) * repolSlowFactor
  const p3End = clamp(p2End + p3Dur, p2End + 0.02, 0.985)

  const data = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let v
    if (t < p0Start) {
      v = cellRestingMv
    } else if (t < p0End) {
      v = cellRestingMv + (upstrokePeak - cellRestingMv) * smooth01((t - p0Start) / (p0End - p0Start))
    } else if (t < p1End) {
      v = upstrokePeak + (notchMv - upstrokePeak) * smooth01((t - p0End) / (p1End - p0End))
    } else if (t < p2End) {
      v = notchMv + (plateauMv - notchMv) * smooth01(Math.min(1, ((t - p1End) / (p2End - p1End)) * 3))
    } else if (t < p3End) {
      v = plateauMv + (cellRestingMv - plateauMv) * smooth01((t - p2End) / (p3End - p2End))
    } else {
      v = cellRestingMv
      if (isPurkinje) v += 4 * smooth01((t - p3End) / (1 - p3End)) // slight Phase 4 automaticity (slow If)
      if (uWaveMv > 0) {
        const uCenter = p3End + (1 - p3End) * 0.35
        const uWidth  = Math.max(0.01, (1 - p3End) * 0.28)
        const d = (t - uCenter) / uWidth
        v += uWaveMv * Math.exp(-d * d * 4)
      }
    }
    data.push([t, Math.round(v * 10) / 10])
  }

  const label0 = isPurkinje ? 'Phase 0 — Fastest Upstroke' : 'Phase 0 — Fast Upstroke'
  const phases = [
    { id: 'p4r', label: 'Phase 4 — Resting Potential', tRange: [0, p0Start],
      channels: isPurkinje ? 'I_K1 + slow I_f' : 'I_K1 (inward rectifier)',
      short: isAtrium ? 'Phase 4 — resting potential (I_K1). Fires almost immediately after SA.' : 'Phase 4 — resting potential (I_K1)',
      ions: 'K⁺ outward via I_K1 holds a stable resting potential until an external stimulus arrives.' },
    { id: 'p0', label: label0, tRange: [p0Start, p0End],
      channels: isPurkinje ? 'I_Na (fast) — highest dV/dt in heart' : 'I_Na (fast voltage-gated Na⁺)',
      short: 'Phase 0 — Rapid depolarization (I_Na opens)',
      ions: 'Na⁺ rushes in through fast channels → rapid upstroke. I_K1 closes as I_Na snaps open.' },
    { id: 'p1', label: 'Phase 1 — Early Repolarization', tRange: [p0End, p1End],
      channels: 'I_to (transient outward K⁺)', short: 'Phase 1 — transient notch (I_to)',
      ions: 'K⁺ briefly exits via I_to, creating the notch between the upstroke and the plateau.' },
    { id: 'p2', label: isAtrium ? 'Phase 2 — Brief Plateau' : 'Phase 2 — Plateau', tRange: [p1End, p2End],
      channels: 'I_Ca,L (in) balanced vs I_Kr + I_Ks (out)', short: 'Phase 2 — plateau (I_Ca,L opens, I_Kr begins activating)',
      ions: isAtrium
        ? 'Ca²⁺ in via I_Ca,L balanced by K⁺ out — much briefer than the ventricular plateau, giving atrial cells a shorter refractory period.'
        : 'Ca²⁺ in via I_Ca,L is balanced by K⁺ starting to exit via I_Kr/I_Ks, holding the plateau near 0 mV.' },
    { id: 'p3', label: 'Phase 3 — Rapid Repolarization', tRange: [p2End, p3End],
      channels: 'I_Kr + I_Ks (rapid + slow delayed rectifiers)', short: 'Phase 3 — I_Ca,L closes, I_Kr/I_Ks drive repolarization',
      ions: 'I_Ca,L inactivates; I_Kr and I_Ks dominate → rapid return toward resting potential.' },
    { id: 'p4d', label: 'Phase 4 — Electrical Diastole', tRange: [p3End, 1],
      channels: isPurkinje ? 'I_K1 (± slow I_f)' : 'I_K1 (inward rectifier)',
      short: 'Phase 4 — I_K1 maintains resting potential',
      ions: isPurkinje
        ? 'I_K1 stabilizes the resting potential; a slow I_f gives Purkinje fibers slight backup automaticity if SA/AV both fail.'
        : 'I_K1 maintains a stable resting potential — no spontaneous depolarization, unlike the SA node.' },
  ]
  return { data, phases }
}

function phase0AlignmentOffsetMs(currentWave, currentCycleMs, baselineWave, baselineCycleMs) {
  const currentPhase0 = currentWave.phases.find(phase => phase.id === 'p0')?.tRange[0] ?? 0
  const baselinePhase0 = baselineWave.phases.find(phase => phase.id === 'p0')?.tRange[0] ?? 0
  return currentPhase0 * currentCycleMs - baselinePhase0 * baselineCycleMs
}

// A compact excitation contraction model for teaching. It is deliberately
// phenomenological: the AP supplies timing, extracellular calcium and beta-1
// tone scale trigger calcium, and a delayed saturating response generates
// relative twitch force. These traces explain causal relationships without
// implying research-grade calcium or sarcomere kinetics.
function normalizedTransient(dt, rise, decay) {
  if (dt < 0) return 0
  const raw = (1 - Math.exp(-dt / rise)) * Math.exp(-dt / decay)
  const peakT = rise * Math.log(1 + decay / rise)
  const peak = (1 - Math.exp(-peakT / rise)) * Math.exp(-peakT / decay)
  return peak > 0 ? raw / peak : 0
}

function buildExcitationContractionWave(phys, phases, kind, n = 160) {
  const plateau = phases.find(phase => phase.id === 'p2')
  const onset = plateau?.tRange[0] ?? 0.22
  const isAtrium = kind === 'atrium'

  const sympatheticGain = clamp(1 + 0.85 * (phys.symp - 0.2), 0.65, 1.7)
  const calciumGain = clamp(Math.pow(phys.caMgDl / 9.5, 1.15), 0.42, 1.75)
  const potassiumGain = phys.kMEqL > 4
    ? clamp(1 - 0.10 * (phys.kMEqL - 4), 0.35, 1)
    : clamp(1 - 0.025 * (4 - phys.kMEqL), 0.88, 1)
  const vagalGain = isAtrium ? clamp(1 - 0.22 * (phys.para - 0.2), 0.78, 1.05) : 1
  const cellGain = isAtrium ? 0.72 : 1
  const calciumPeak = cellGain * sympatheticGain * calciumGain * potassiumGain * vagalGain

  const lusitropy = clamp(1 + 0.55 * (phys.symp - 0.2), 0.88, 1.45)
  const caRise = isAtrium ? 0.026 : 0.034
  const caDecay = (isAtrium ? 0.105 : 0.175) / lusitropy
  const forceDelay = isAtrium ? 0.025 : 0.035
  const forceRise = isAtrium ? 0.040 : 0.055
  const forceDecay = (isAtrium ? 0.145 : 0.235) / lusitropy
  const hillN = 2.8
  const hillKd = 0.62
  const activation = Math.pow(calciumPeak, hillN) / (Math.pow(hillKd, hillN) + Math.pow(calciumPeak, hillN))
  const baselineActivation = 1 / (Math.pow(hillKd, hillN) + 1)
  const forcePeak = clamp(activation / baselineActivation, 0, 1.35)

  const calcium = []
  const force = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const ca = calciumPeak * normalizedTransient(t - onset, caRise, caDecay)
    const twitch = forcePeak * normalizedTransient(t - onset - forceDelay, forceRise, forceDecay)
    calcium.push([t, Math.round(ca * 1000) / 1000])
    force.push([t, Math.round(twitch * 1000) / 1000])
  }

  return { calcium, force, calciumPeak, forcePeak }
}

// Fast response cells display phases 0 through 4. Slow response nodal cells
// have no distinct phases 1 or 2, so their phase bands display only 4, 0, and 3.
const PHASE_NUMBER = {
  p4r: '4',
  p4: '4',
  p0: '0',
  p1: '1',
  p2: '2',
  p3: '3',
  repol: '3',
  p4d: '4',
}

// ── Ion channel gating tables — per-phase openness (0–1), looked up by the
// CURRENT phase id each frame. No hover required: IonChannelRow below reads
// the shared clock directly and updates automatically as the cursor moves. ──
const SA_ION_CHANNELS = [
  { id: 'If',   label: 'I_f',       note: 'I_f through HCN channels — the pacemaker current', levels: { p4: 1,    p0: 0.15, repol: 0.10 } },
  { id: 'ICaT', label: 'I_Ca,T',    note: 'I_Ca,T through T-type Ca²⁺ channels — activates near threshold', levels: { p4: 0.65, p0: 0.20, repol: 0 } },
  { id: 'ICaL', label: 'I_Ca,L',    note: 'I_Ca,L through L-type Ca²⁺ channels — drives the SA upstroke (NOT I_Na)', levels: { p4: 0.05, p0: 1,    repol: 0.10 } },
  { id: 'IK',   label: 'I_K/I_K,ACh', note: 'K⁺ currents through delayed rectifier and GIRK channels', levels: { p4: 0.10, p0: 0,    repol: 1 } },
]
const AV_ION_CHANNELS = [
  { id: 'If',   label: 'I_f',       note: 'I_f through HCN channels — supports latent pacemaker activity', levels: { p4: 0.70, p0: 0.10, repol: 0.10 } },
  { id: 'ICaT', label: 'I_Ca,T',    note: 'I_Ca,T through T-type Ca²⁺ channels — contributes as threshold approaches', levels: { p4: 0.55, p0: 0.20, repol: 0 } },
  { id: 'ICaL', label: 'I_Ca,L',    note: 'I_Ca,L through L-type Ca²⁺ channels — carries the slow AV nodal upstroke', levels: { p4: 0.05, p0: 1, repol: 0.10 } },
  { id: 'IK',   label: 'I_K/I_K,ACh', note: 'K⁺ currents through delayed rectifier and GIRK channels', levels: { p4: 0.10, p0: 0, repol: 1 } },
]
const MYO_ION_CHANNELS = [
  { id: 'INa',  label: 'I_Na',  note: 'Fast Na⁺ current — snaps on at Phase 0', levels: { p4r: 0,    p0: 1,    p1: 0.05, p2: 0,    p3: 0,    p4d: 0 } },
  { id: 'IK1',  label: 'I_K1',  note: 'Inward rectifier current — holds resting potential, decreases on the upstroke', levels: { p4r: 1, p0: 0.05, p1: 0.10, p2: 0.10, p3: 0.20, p4d: 1 } },
  { id: 'Ito',  label: 'I_to',  note: 'Transient outward current — brief Phase 1 notch', levels: { p4r: 0, p0: 0.10, p1: 1,    p2: 0.15, p3: 0,    p4d: 0 } },
  { id: 'ICaL', label: 'I_Ca,L', note: 'L-type Ca²⁺ current — supports the plateau', levels: { p4r: 0,   p0: 0.20, p1: 0.40, p2: 1,    p3: 0.25, p4d: 0 } },
  { id: 'IKr',  label: 'I_Kr',  note: 'Rapid delayed rectifier current — begins in Phase 2, dominant in Phase 3', levels: { p4r: 0, p0: 0,    p1: 0.10, p2: 0.45, p3: 1,    p4d: 0.10 } },
  { id: 'IKs',  label: 'I_Ks',  note: 'Slow delayed rectifier current — joins I_Kr for repolarization', levels: { p4r: 0, p0: 0,    p1: 0.05, p2: 0.35, p3: 0.90, p4d: 0.10 } },
]
const PK_ION_CHANNELS = [
  { id: 'INa',  label: 'I_Na',  note: 'Fast Na⁺ current produces the fastest upstroke in the heart (highest dV/dt)', levels: { p4r: 0,   p0: 1,    p1: 0.05, p2: 0,    p3: 0,    p4d: 0 } },
  { id: 'IK1',  label: 'I_K1',  note: 'Inward rectifier current — dominant at rest', levels: { p4r: 1, p0: 0.05, p1: 0.10, p2: 0.10, p3: 0.20, p4d: 0.80 } },
  { id: 'Ito',  label: 'I_to',  note: 'Transient outward current — brief Phase 1 notch', levels: { p4r: 0, p0: 0.10, p1: 1,    p2: 0.15, p3: 0,    p4d: 0 } },
  { id: 'ICaL', label: 'I_Ca,L', note: 'L-type Ca²⁺ current — supports the longest plateau of any cardiac cell', levels: { p4r: 0, p0: 0.20, p1: 0.40, p2: 1,  p3: 0.25, p4d: 0 } },
  { id: 'IKr',  label: 'I_Kr',  note: 'Rapid delayed rectifier current', levels: { p4r: 0, p0: 0, p1: 0.10, p2: 0.45, p3: 1,    p4d: 0.10 } },
  { id: 'IKs',  label: 'I_Ks',  note: 'Slow delayed rectifier current', levels: { p4r: 0, p0: 0, p1: 0.05, p2: 0.35, p3: 0.90, p4d: 0.10 } },
  { id: 'If',   label: 'I_f', note: 'Slow I_f supports slight automaticity — backup pacemaker if SA/AV both fail', levels: { p4r: 0.05, p0: 0, p1: 0, p2: 0, p3: 0, p4d: 0.35 } },
]
const ATRIAL_ION_CHANNELS = [
  { id: 'INa',  label: 'I_Na',  note: 'Fast Na⁺ current — snaps on at Phase 0', levels: { p4r: 0,    p0: 1,    p1: 0.05, p2: 0,    p3: 0,    p4d: 0 } },
  { id: 'IK1',  label: 'I_K1',  note: 'Inward rectifier current — holds resting potential, decreases on the upstroke', levels: { p4r: 1, p0: 0.05, p1: 0.10, p2: 0.10, p3: 0.20, p4d: 1 } },
  { id: 'Ito',  label: 'I_to',  note: 'Transient outward current — brief Phase 1 notch', levels: { p4r: 0, p0: 0.10, p1: 1,    p2: 0.15, p3: 0,    p4d: 0 } },
  { id: 'ICaL', label: 'I_Ca,L', note: 'L-type Ca²⁺ current — supports a much briefer plateau than in ventricle', levels: { p4r: 0,  p0: 0.20, p1: 0.40, p2: 1,    p3: 0.25, p4d: 0 } },
  { id: 'IKr',  label: 'I_Kr',  note: 'Rapid delayed rectifier current — begins in Phase 2, dominant in Phase 3', levels: { p4r: 0, p0: 0,    p1: 0.10, p2: 0.45, p3: 1,    p4d: 0.10 } },
  { id: 'IKs',  label: 'I_Ks',  note: 'Slow delayed rectifier current — joins I_Kr for repolarization', levels: { p4r: 0, p0: 0,    p1: 0.05, p2: 0.35, p3: 0.90, p4d: 0.10 } },
]

// Keep current symbols and channel protein names visually distinct. The
// molecular examples are intentionally family-level teaching labels.
const CURRENT_CHANNEL_GLOSSARY = [
  { id: 'I_f', name: 'Funny current', channel: 'HCN channels', detail: 'pacemaker depolarization' },
  { id: 'I_Ca,T', name: 'T-type calcium current', channel: 'CaV3.x channels', detail: 'approach to nodal threshold' },
  { id: 'I_Ca,L', name: 'L-type calcium current', channel: 'CaV1.x channels', detail: 'nodal upstroke and myocardial plateau' },
  { id: 'I_K / I_K,ACh', name: 'Delayed rectifier and ACh-sensitive K⁺ currents', channel: 'delayed rectifier channels and GIRK channels', detail: 'nodal repolarization and vagal slowing' },
  { id: 'I_Na', name: 'Fast sodium current', channel: 'NaV1.5 channels', detail: 'fast response Phase 0' },
  { id: 'I_K1', name: 'Inward rectifier potassium current', channel: 'Kir2.x channels', detail: 'stable resting potential' },
  { id: 'I_to', name: 'Transient outward potassium current', channel: 'primarily Kv4.x channels', detail: 'Phase 1 notch' },
  { id: 'I_Kr', name: 'Rapid delayed rectifier potassium current', channel: 'hERG or Kv11.1 channels', detail: 'Phase 3 repolarization' },
  { id: 'I_Ks', name: 'Slow delayed rectifier potassium current', channel: 'Kv7.1 with KCNE1', detail: 'Phase 3 repolarization' },
]
function IonChannelGlossary() {
  return (
    <div className="mt-2 rounded-xl border border-gray-800 bg-gray-900/60 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Current and channel key</h3>
          <p className="mt-0.5 text-xs text-gray-300"><span className="font-mono text-amber-300">I</span> symbols name currents. Channel names identify the membrane proteins that conduct them.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-gray-200" aria-label="Current contribution color key">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600" />Minimal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" />Contributing</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Dominant</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
        {CURRENT_CHANNEL_GLOSSARY.map(item => (
          <div key={item.id} className="rounded-md border border-gray-800 bg-gray-950/40 px-2 py-1.5 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="w-20 shrink-0 font-mono font-semibold text-amber-300">{item.id}</span>
              <span className="font-medium text-white">{item.name}</span>
            </div>
            <div className="mt-0.5 pl-[5.5rem] leading-snug text-gray-300">
              <span className="font-semibold text-cyan-300">Channel:</span> {item.channel}
              <span className="text-gray-400"> · {item.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Ion channel badge row — reads clockRef directly and mutates DOM opacity
// via refs (same technique HeartAnimation.jsx uses) so several panels animating
// at once don't force a React re-render 60x/second.
function IonChannelRow({ clockRef, cycleMs, phases, channels }) {
  const phasesRef = useRef(phases)
  useEffect(() => { phasesRef.current = phases }, [phases])
  const elRefs = useRef({})

  useEffect(() => {
    let rafId
    const frame = () => {
      const frac = ((clockRef.current.tInCycle / cycleMs) % 1 + 1) % 1
      const list = phasesRef.current
      const phase = list.find(ph => frac >= ph.tRange[0] && frac < ph.tRange[1]) || list[list.length - 1]
      channels.forEach(ch => {
        const el = elRefs.current[ch.id]
        if (!el) return
        const level = phase ? (ch.levels[phase.id] ?? 0) : 0
        const state = level < 0.2 ? 'Minimal' : level < 0.7 ? 'Contributing' : 'Dominant'
        const stateColor = state === 'Minimal' ? '#4b5563' : state === 'Contributing' ? '#22d3ee' : '#fbbf24'
        el.style.backgroundColor = stateColor
        el.style.opacity = '1'
        el.style.transform = `scale(${state === 'Dominant' ? '1.22' : state === 'Contributing' ? '1.10' : '1'})`
        el.style.boxShadow = state === 'Dominant' ? '0 0 6px #fbbf24' : state === 'Contributing' ? '0 0 3px #22d3ee' : 'none'
        el.setAttribute('aria-label', `${ch.label}: ${state.toLowerCase()} current contribution`)
      })
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [clockRef, cycleMs, channels])

  return (
    <div
      className="grid gap-1 px-2 py-1.5 border-t border-gray-800/70 bg-gray-950/40"
      style={{ gridTemplateColumns: `repeat(${channels.length}, minmax(0, 1fr))` }}
    >
      {channels.map(ch => (
        <div key={ch.id} className="flex min-w-0 items-center justify-center gap-1 rounded-md border border-gray-600/80 px-1 py-1" title={ch.note}>
          <span
            ref={el => { elRefs.current[ch.id] = el }}
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-600 transition-all duration-150"
          />
          <span className="whitespace-nowrap font-mono text-[10px] font-semibold leading-none text-gray-100">{ch.label}</span>
        </div>
      ))}
    </div>
  )
}

// Live phase-description line — same DOM-ref-mutation technique, no hover
// required. Text snaps to whichever phase the cursor currently sits in.
function PhaseLabel({ clockRef, cycleMs, phases }) {
  const ref = useRef(null)
  const phasesRef = useRef(phases)
  useEffect(() => { phasesRef.current = phases }, [phases])
  useEffect(() => {
    let rafId
    const frame = () => {
      const frac = ((clockRef.current.tInCycle / cycleMs) % 1 + 1) % 1
      const list = phasesRef.current
      const phase = list.find(ph => frac >= ph.tRange[0] && frac < ph.tRange[1])
      if (ref.current) ref.current.textContent = phase ? phase.short : ''
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [clockRef, cycleMs])
  return <p ref={ref} className="min-h-10 px-3 pt-1 font-mono text-xs leading-snug text-cyan-200" />
}

// One live panel = trace (TraceCanvas) + optional phase-number bands +
// live phase description + the ion channel row underneath.
function APLivePanel({
  clockRef,
  cycleMs,
  title,
  sub,
  data,
  phases,
  channels,
  color,
  showPhaseNumbers,
  mechanics,
  referenceMechanics,
  referenceData,
  referenceCycleMs,
  referenceOffsetMs = 0,
  referenceLabel,
}) {
  const xDomain = useMemo(() => [0, cycleMs], [cycleMs])
  const phaseMarkers = useMemo(
    () => phases.map(ph => {
      const col = AP_PHASE_COLORS[ph.id] || [100, 100, 100, 25]
      return { x0: ph.tRange[0] * cycleMs, x1: ph.tRange[1] * cycleMs, color: `rgba(${col[0]},${col[1]},${col[2]},${(col[3] / 255).toFixed(2)})` }
    }),
    [phases, cycleMs]
  )
  const bandLabels = useMemo(
    () => (showPhaseNumbers
      ? phases.map(ph => ({ x: (ph.tRange[0] + ph.tRange[1]) / 2 * cycleMs, text: PHASE_NUMBER[ph.id] || '' }))
      : null),
    [phases, cycleMs, showPhaseNumbers]
  )
  const valueAt = useCallback((t) => interpAP(data, t / cycleMs), [data, cycleMs])
  const referenceValueAt = useCallback(
    (t) => referenceData && referenceCycleMs ? interpAP(referenceData, (t - referenceOffsetMs) / referenceCycleMs) : null,
    [referenceData, referenceCycleMs, referenceOffsetMs]
  )
  const calciumAt = useCallback(
    (t) => mechanics ? interpAP(mechanics.calcium, t / cycleMs) : 0,
    [mechanics, cycleMs]
  )
  const forceAt = useCallback(
    (t) => mechanics ? interpAP(mechanics.force, t / cycleMs) : 0,
    [mechanics, cycleMs]
  )
  const referenceCalciumAt = useCallback(
    (t) => referenceMechanics && referenceCycleMs
      ? interpAP(referenceMechanics.calcium, (t - referenceOffsetMs) / referenceCycleMs)
      : null,
    [referenceMechanics, referenceCycleMs, referenceOffsetMs]
  )
  const referenceForceAt = useCallback(
    (t) => referenceMechanics && referenceCycleMs
      ? interpAP(referenceMechanics.force, (t - referenceOffsetMs) / referenceCycleMs)
      : null,
    [referenceMechanics, referenceCycleMs, referenceOffsetMs]
  )

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden flex-1 min-w-0">
      <div className="px-3 pt-1.5 pb-0.5">
        <div className="text-sm font-semibold text-gray-100 leading-snug">{title}</div>
        <div className="min-h-9 text-xs font-medium leading-snug text-gray-300">{sub}</div>
      </div>
      <div className="flex items-baseline justify-between px-3 pb-0.5">
        <span className="text-xs font-semibold" style={{ color }}>Membrane Potential (mV)</span>
        <span className="text-xs text-gray-300">Intracellular membrane potential</span>
      </div>
      <TraceCanvas
        clockRef={clockRef}
        valueAt={valueAt}
        xDomain={xDomain}
        yDomain={AP_Y_DOMAIN}
        color={color}
        phaseMarkers={phaseMarkers}
        bandLabels={bandLabels}
        referenceValueAt={referenceData ? referenceValueAt : null}
        referenceXMin={referenceOffsetMs}
        referenceXMax={referenceOffsetMs + referenceCycleMs}
        height={112}
      />
      {referenceData && (
        <div className="flex items-center gap-2 px-3 pt-1 text-[11px] font-medium text-gray-300">
          <span className="inline-block w-7 border-t border-dashed border-slate-300" aria-hidden="true" />
          {referenceLabel}
        </div>
      )}
      <PhaseLabel clockRef={clockRef} cycleMs={cycleMs} phases={phases} />
      <IonChannelRow clockRef={clockRef} cycleMs={cycleMs} phases={phases} channels={channels} />
      {mechanics ? (
        <div className="border-t border-gray-800 bg-gray-950/35">
          <div className="flex items-baseline justify-between px-3 pt-2 pb-0.5">
            <span className="text-xs font-semibold text-cyan-200">Relative cytosolic Ca²⁺</span>
            <span className="text-xs text-gray-300">Ca²⁺ induced Ca²⁺ release</span>
          </div>
          <TraceCanvas
            clockRef={clockRef}
            valueAt={calciumAt}
            xDomain={xDomain}
            yDomain={CALCIUM_Y_DOMAIN}
            color="#22d3ee"
            referenceValueAt={referenceMechanics ? referenceCalciumAt : null}
            referenceXMin={referenceOffsetMs}
            referenceXMax={referenceOffsetMs + referenceCycleMs}
            height={74}
          />
          <div className="flex items-baseline justify-between px-3 pt-1.5 pb-0.5">
            <span className="text-xs font-semibold text-rose-200">Relative twitch force</span>
            <span className="text-xs font-medium text-gray-200">Peak {Math.round(mechanics.forcePeak * 100)}%</span>
          </div>
          <TraceCanvas
            clockRef={clockRef}
            valueAt={forceAt}
            xDomain={xDomain}
            yDomain={FORCE_Y_DOMAIN}
            color="#fb7185"
            referenceValueAt={referenceMechanics ? referenceForceAt : null}
            referenceXMin={referenceOffsetMs}
            referenceXMax={referenceOffsetMs + referenceCycleMs}
            height={74}
          />
          <p className="px-3 py-2 text-xs text-gray-300 leading-relaxed">
            Calcium rises after L type channels open. Force follows after a short delay as calcium binds troponin and activates cross bridges.
          </p>
        </div>
      ) : (
        <p className="px-3 py-2 border-t border-gray-800 text-xs font-medium text-gray-300 leading-relaxed">
          Specialized electrical tissue: pumping force is not displayed.
        </p>
      )}
    </div>
  )
}

function LabeledSlider({ label, value, onChange, min, max, step = 1, unit = '', accent = 'accent-cyan-500', formatValue }) {
  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-300">{label}</span>
        <span className="text-xs font-mono text-gray-200">{formatValue ? formatValue(value) : `${value}${unit}`}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className={`w-full ${accent}`}
      />
    </div>
  )
}

const SPEEDS = [0.1, 1]

function playbackRateLabel(timeScale) {
  return timeScale === 0.1
    ? 'Study rate · 0.1× real time'
    : 'Real time · 1×'
}

const TRACE_OPTIONS = [
  { id: 'sa', label: 'SA node', color: '#34d399' },
  { id: 'atrium', label: 'Atrial myocyte', color: '#fbbf24' },
  { id: 'av', label: 'AV node', color: '#f472b6' },
  { id: 'purkinje', label: 'Purkinje fiber', color: '#a78bfa' },
  { id: 'ventricle', label: 'Ventricular myocyte', color: '#60a5fa' },
]

const CONDUCTION_PATHWAY = [
  { label: 'SA node', traceId: 'sa' },
  { label: 'Atrial myocardium', traceId: 'atrium' },
  { label: 'AV node', traceId: 'av' },
  { label: 'His bundle', traceId: null },
  { label: 'Bundle branches', traceId: null },
  { label: 'Purkinje fibers', traceId: 'purkinje' },
  { label: 'Ventricular myocytes', traceId: 'ventricle' },
]

function ConductionPathway({ selectedTissues }) {
  return (
    <div className="mb-2 rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Normal cardiac conduction sequence">
        {CONDUCTION_PATHWAY.map((item, index) => {
          const selected = item.traceId && selectedTissues.includes(item.traceId)
          return (
          <span key={item.label} className="contents">
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              selected
                ? 'border-emerald-700/60 bg-emerald-950/50 text-emerald-300'
                : 'border-gray-600 bg-gray-950/50 text-gray-200'
            }`}>
              {item.label}
            </span>
            {index < CONDUCTION_PATHWAY.length - 1 && <span className="font-bold text-gray-300" aria-hidden="true">→</span>}
          </span>
          )
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-300">
        Green structures have selected traces below. His bundle and bundle branches remain in the pathway even though separate traces are not available.
      </p>
    </div>
  )
}

function LiveActionPotentials() {
  const [lessonView, setLessonView] = useState('compare')
  const [selectedTissues, setSelectedTissues] = useState(['sa', 'ventricle'])
  const [sympathetic, setSympathetic] = useState(20)
  const [parasympathetic, setParasympathetic] = useState(20)
  const [kMEqL, setKMEqL] = useState(4.0)
  const [caMgDl, setCaMgDl] = useState(9.5)
  const [speed, setSpeed] = useState(0.1)
  const [experimentsOpen, setExperimentsOpen] = useState(false)
  const toolbarRef = useRef(null)
  const [toolbarHeight, setToolbarHeight] = useState(112)

  useEffect(() => {
    const toolbar = toolbarRef.current
    const observer = new ResizeObserver(() => setToolbarHeight(toolbar.getBoundingClientRect().height))
    observer.observe(toolbar)
    setToolbarHeight(toolbar.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [])

  const phys = useMemo(
    () => computeAPPhysiology({ sympathetic, parasympathetic, kMEqL, caMgDl }),
    [sympathetic, parasympathetic, kMEqL, caMgDl]
  )
  const atrialFireFrac = 0.05
  const avEntryFrac = 0.08
  const hisActivationFrac = clamp(atrialFireFrac + phys.avDelayMs / phys.cycleMs, 0.13, 0.38)
  const purkinjeFireFrac = clamp(hisActivationFrac + 20 / phys.cycleMs, 0.15, 0.42)
  const ventricularFireFrac = clamp(purkinjeFireFrac + 20 / phys.cycleMs, 0.17, 0.45)

  const sa  = useMemo(() => buildSlowResponseWave(phys.sa, { tissue: 'sa' }), [phys.sa])
  const atr = useMemo(() => buildWorkingCellWave(phys.atrium, 'atrium', 100, atrialFireFrac), [phys.atrium])
  const av  = useMemo(() => buildSlowResponseWave(phys.av, { fireAtFrac: avEntryFrac, tissue: 'av' }), [phys.av])
  const pk  = useMemo(() => buildWorkingCellWave(phys.purkinje, 'purkinje', 100, purkinjeFireFrac), [phys.purkinje, purkinjeFireFrac])
  const myo = useMemo(() => buildWorkingCellWave(phys.ventricle, 'ventricle', 100, ventricularFireFrac), [phys.ventricle, ventricularFireFrac])
  const baselineSa = useMemo(
    () => buildSlowResponseWave(BASELINE_AP_PHYSIOLOGY.sa, { tissue: 'sa' }),
    []
  )
  const baselineAv = useMemo(
    () => buildSlowResponseWave(BASELINE_AP_PHYSIOLOGY.av, { fireAtFrac: avEntryFrac, tissue: 'av' }),
    [avEntryFrac]
  )
  const baselineHisActivationFrac = clamp(
    atrialFireFrac + BASELINE_AP_PHYSIOLOGY.avDelayMs / BASELINE_AP_PHYSIOLOGY.cycleMs,
    0.13,
    0.38
  )
  const baselinePurkinjeFireFrac = clamp(
    baselineHisActivationFrac + 20 / BASELINE_AP_PHYSIOLOGY.cycleMs,
    0.15,
    0.42
  )
  const baselineVentricularFireFrac = clamp(
    baselinePurkinjeFireFrac + 20 / BASELINE_AP_PHYSIOLOGY.cycleMs,
    0.17,
    0.45
  )
  const baselineAtr = useMemo(
    () => buildWorkingCellWave(BASELINE_AP_PHYSIOLOGY.atrium, 'atrium', 100, atrialFireFrac),
    [atrialFireFrac]
  )
  const baselinePk = useMemo(
    () => buildWorkingCellWave(BASELINE_AP_PHYSIOLOGY.purkinje, 'purkinje', 100, baselinePurkinjeFireFrac),
    [baselinePurkinjeFireFrac]
  )
  const baselineMyo = useMemo(
    () => buildWorkingCellWave(BASELINE_AP_PHYSIOLOGY.ventricle, 'ventricle', 100, baselineVentricularFireFrac),
    [baselineVentricularFireFrac]
  )
  const atrialMechanics = useMemo(
    () => buildExcitationContractionWave(phys, atr.phases, 'atrium'),
    [phys, atr.phases]
  )
  const ventricularMechanics = useMemo(
    () => buildExcitationContractionWave(phys, myo.phases, 'ventricle'),
    [phys, myo.phases]
  )
  const baselineAtrialMechanics = useMemo(
    () => buildExcitationContractionWave(BASELINE_AP_PHYSIOLOGY, baselineAtr.phases, 'atrium'),
    [baselineAtr.phases]
  )
  const baselineVentricularMechanics = useMemo(
    () => buildExcitationContractionWave(BASELINE_AP_PHYSIOLOGY, baselineMyo.phases, 'ventricle'),
    [baselineMyo.phases]
  )

  const { clockRef, tMs, isPlaying, toggle, scrub } = useLocalClock(phys.cycleMs, null, speed)


  const toggleTissue = (id) => {
    setSelectedTissues(current => {
      if (current.includes(id)) return current.length === 1 ? current : current.filter(item => item !== id)
      return [...current, id]
    })
  }

  const tracePanels = {
    sa: {
      title: 'SA Node — Automaticity',
      sub: `Fires first · maximum diastolic potential ${phys.sa.mdp.toFixed(1)} mV · ${Math.round(phys.saRate)} bpm`,
      data: sa.data, phases: sa.phases, channels: SA_ION_CHANNELS, color: '#34d399', showPhaseNumbers: true,
      referenceData: lessonView === 'experiment' ? baselineSa.data : null,
      referenceCycleMs: BASELINE_AP_PHYSIOLOGY.cycleMs,
      referenceLabel: 'Baseline (Reset physiology) · cardiac cycle timing retained',
    },
    atrium: {
      title: 'Atrial Myocyte',
      sub: 'Depolarizes shortly after the SA node · brief plateau',
      data: atr.data, phases: atr.phases, channels: ATRIAL_ION_CHANNELS, color: '#fbbf24', showPhaseNumbers: true, mechanics: atrialMechanics,
      referenceMechanics: lessonView === 'experiment' ? baselineAtrialMechanics : null,
      referenceData: lessonView === 'experiment' ? baselineAtr.data : null,
      referenceCycleMs: BASELINE_AP_PHYSIOLOGY.cycleMs,
      referenceOffsetMs: phase0AlignmentOffsetMs(atr, phys.cycleMs, baselineAtr, BASELINE_AP_PHYSIOLOGY.cycleMs),
      referenceLabel: 'Baseline (Reset physiology) · AP, Ca²⁺, and force aligned at Phase 0',
    },
    av: {
      title: 'AV Node — Slow Conduction',
      sub: `Activated by atrial input · slow response AP · AV delay ${phys.avDelayMs} ms`,
      data: av.data, phases: av.phases, channels: AV_ION_CHANNELS, color: '#f472b6', showPhaseNumbers: true,
      referenceData: lessonView === 'experiment' ? baselineAv.data : null,
      referenceCycleMs: BASELINE_AP_PHYSIOLOGY.cycleMs,
      referenceLabel: 'Baseline (Reset physiology) · cardiac cycle timing retained',
    },
    purkinje: {
      title: 'Purkinje Fiber',
      sub: 'Activated after the AV node, His bundle, and bundle branches · before ventricular myocytes',
      data: pk.data, phases: pk.phases, channels: PK_ION_CHANNELS, color: '#a78bfa', showPhaseNumbers: true,
      referenceData: lessonView === 'experiment' ? baselinePk.data : null,
      referenceCycleMs: BASELINE_AP_PHYSIOLOGY.cycleMs,
      referenceOffsetMs: phase0AlignmentOffsetMs(pk, phys.cycleMs, baselinePk, BASELINE_AP_PHYSIOLOGY.cycleMs),
      referenceLabel: 'Baseline (Reset physiology) · aligned at Phase 0 to compare AP shape',
    },
    ventricle: {
      title: 'Ventricular Myocyte',
      sub: 'Activated by the Purkinje network · working myocardium',
      data: myo.data, phases: myo.phases, channels: MYO_ION_CHANNELS, color: '#60a5fa', showPhaseNumbers: true, mechanics: ventricularMechanics,
      referenceMechanics: lessonView === 'experiment' ? baselineVentricularMechanics : null,
      referenceData: lessonView === 'experiment' ? baselineMyo.data : null,
      referenceCycleMs: BASELINE_AP_PHYSIOLOGY.cycleMs,
      referenceOffsetMs: phase0AlignmentOffsetMs(myo, phys.cycleMs, baselineMyo, BASELINE_AP_PHYSIOLOGY.cycleMs),
      referenceLabel: 'Baseline (Reset physiology) · AP, Ca²⁺, and force aligned at Phase 0',
    },
  }
  const visiblePanels = TRACE_OPTIONS.filter(option => selectedTissues.includes(option.id))


  const experimentControls = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
      <LabeledSlider label="Sympathetic Tone" value={sympathetic} min={0} max={100} onChange={setSympathetic} unit="%" accent="accent-red-500" />
      <LabeledSlider label="Parasympathetic Tone" value={parasympathetic} min={0} max={100} onChange={setParasympathetic} unit="%" accent="accent-blue-500" />
      <LabeledSlider label="Extracellular [K⁺]" value={kMEqL} min={2.0} max={9.0} step={0.1} onChange={setKMEqL} formatValue={v => `${v.toFixed(1)} mEq/L`} accent="accent-orange-500" />
      <LabeledSlider label="Extracellular [Ca²⁺]" value={caMgDl} min={5.0} max={15.0} step={0.1} onChange={setCaMgDl} formatValue={v => `${v.toFixed(1)} mg/dL`} accent="accent-teal-500" />
      <button type="button" onClick={() => {
        setSympathetic(20)
        setParasympathetic(20)
        setKMEqL(4.0)
        setCaMgDl(9.5)
      }} className="justify-self-start rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 hover:bg-gray-700">
        Reset physiology
      </button>
    </div>
  )
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2" role="tablist" aria-label="Action potential learning stages">
        <button
          type="button"
          role="tab"
          aria-selected={lessonView === 'compare'}
          onClick={() => setLessonView('compare')}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            lessonView === 'compare'
              ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200'
          }`}
        >
          1 · Compare cell types
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={lessonView === 'experiment'}
          onClick={() => setLessonView('experiment')}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            lessonView === 'experiment'
              ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200'
          }`}
        >
          2 · Run experiments
        </button>
      </div>


      <p className="mb-2 text-xs leading-relaxed text-gray-300">
        Choose one trace for close study or several to compare. Use Study rate for observation and Real time for the physiological pace.
      </p>
      <div ref={toolbarRef} className="ap-toolbar sticky top-0 z-30 mb-3 rounded-xl border border-emerald-800 bg-gray-900 p-3 shadow-lg" aria-label="Action potential controls">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggle} className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <label className="flex min-w-0 items-center gap-2 text-xs text-gray-200">
            <span>Time</span>
            <input type="range" min={0} max={phys.cycleMs}
              value={Math.min(Math.max(tMs, 0), phys.cycleMs)}
              onChange={e => scrub(Number(e.target.value))}
              aria-label="Cardiac cycle position"
              className="w-[250px] max-w-[38vw] accent-emerald-500" />
          </label>
          <span className="w-28 text-xs font-mono text-gray-100 tabular-nums">{Math.round(tMs)} / {Math.round(phys.cycleMs)} ms</span>
          <div className="flex flex-wrap gap-1" aria-label="Animation rate">
            {SPEEDS.map(s => (
              <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s}
                aria-label={`Set animation to ${playbackRateLabel(s)}`}
                className={`rounded-lg border px-2 py-2 text-xs font-medium ${speed === s ? 'border-emerald-600 bg-emerald-950 text-white' : 'border-gray-600 bg-gray-800 text-gray-200'}`}>
                {playbackRateLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-gray-700 pt-2" aria-label="Action potential trace selectors">
          <span className="mr-1 text-xs font-semibold text-gray-200">Traces</span>
          {TRACE_OPTIONS.map(option => {
            const selected = selectedTissues.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTissue(option.id)}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  selected
                    ? 'border-emerald-600 bg-emerald-950/60 text-white'
                    : 'border-gray-600 bg-gray-950/50 text-gray-300 hover:border-gray-400 hover:text-white'
                }`}
              >
                <span className="font-bold" aria-hidden="true">{selected ? '✓' : '+'}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} aria-hidden="true" />
                {option.label}
              </button>
            )
          })}
        </div>
        {lessonView === 'experiment' && (
          <div className="mt-2 border-t border-gray-700 pt-2 xl:hidden">
            <button type="button" aria-expanded={experimentsOpen} aria-controls="ap-mobile-experiments"
              onClick={() => setExperimentsOpen(value => !value)}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-100">
              {experimentsOpen ? 'Hide experiment controls' : 'Show experiment controls'}
            </button>
            {experimentsOpen && <div id="ap-mobile-experiments" className="mt-3 max-h-[35dvh] overflow-y-auto pr-2">{experimentControls}</div>}
          </div>
        )}
      </div>
      <ConductionPathway selectedTissues={selectedTissues} />
      <p className="text-xs text-gray-300 mb-2 leading-relaxed">
        The AV node depolarizes after atrial myocardium. The displayed AV delay represents slow conduction through
        the nodal region before His bundle, bundle branch, and Purkinje activation. Purkinje fibers then deliver
        excitation to ventricular myocytes.
      </p>


      <div className={lessonView === 'experiment' ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-3' : ''}>
        <div className="min-w-0">
          <div className={`grid grid-cols-1 gap-2 items-stretch ${
            visiblePanels.length > 1
              ? lessonView === 'compare'
                ? visiblePanels.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2 xl:grid-cols-3'
                : 'xl:grid-cols-2'
              : ''
          }`}>
            {visiblePanels.map(option => (
              <APLivePanel
                key={option.id}
                clockRef={clockRef}
                cycleMs={phys.cycleMs}
                {...tracePanels[option.id]}
              />
            ))}
          </div>

          <IonChannelGlossary />
        </div>
        {lessonView === 'experiment' && (
          <aside aria-label="Experiment controls" className="ap-experiment-panel hidden self-start rounded-xl border border-gray-700 bg-gray-900 p-3 xl:sticky xl:block"
            style={{ top: toolbarHeight + 12, maxHeight: `calc(100dvh - ${toolbarHeight + 24}px)`, overflowY: 'auto' }}>
            <h3 className="mb-3 text-sm font-semibold text-white">Experiment controls</h3>
            {experimentControls}
          </aside>
        )}
      </div>
      {lessonView === 'experiment' && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2" aria-label="Experiment explanations">
      {/* ── ANS controls ── */}
      <div className="mt-2 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
        <h3 className="text-sm font-semibold text-white mb-1.5">Autonomic Nervous System</h3>
        <div className="grid grid-cols-1 gap-2 mt-2">
          <Callout>
            <strong>Sympathetic (β1 adrenergic):</strong> Noradrenaline / adrenaline → β1 receptor → ↑ I_f, ↑ I_Ca,L.
            SA node Phase 4 slope steepens (faster automaticity) and cycle shortens; max diastolic potential becomes
            slightly less negative. In working myocardium, trigger Ca²⁺, twitch force, and relaxation rate increase.
          </Callout>
          <Callout>
            <strong>Parasympathetic (M2 cholinergic):</strong> ACh → M2 receptor → ↑ I_K,ACh → hyperpolarization.
            SA node Phase 4 slope flattens, max diastolic potential hyperpolarizes, and the cycle lengthens
            dramatically at high tone. Parasympathetic has minimal direct effect on ventricular myocytes — they
            have few M2 receptors.
          </Callout>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 px-3 py-1.5 rounded-lg bg-gray-950/50 border border-gray-800">
          <span className="text-xs text-gray-400">AV node conduction delay</span>
          <span className="text-sm font-mono text-amber-300">Δt ≈ {phys.avDelayMs} ms</span>
          <span className="text-xs font-medium text-gray-300">Time available for atrial contraction and ventricular filling.</span>
        </div>
        {phys.bothElevated && (
          <div className="mt-1.5 px-3 py-1 rounded-lg bg-purple-950/40 border border-purple-700/40 text-xs text-purple-300">
            Competing inputs — autonomic balance determines net heart rate.
          </div>
        )}
      </div>

      {/* ── Ion concentration controls ── */}
      <div className="mt-2 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
        <h3 className="text-sm font-semibold text-white mb-1.5">Extracellular Ion Concentrations</h3>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {kMEqL > 5.5 ? (
            <Callout>
              ↑ [K⁺]out shifts EK toward 0, making maximum diastolic potential in the SA node and resting Vm in
              working cells less negative. Persistent depolarization also reduces fast Na⁺ channel availability in
              atrial, Purkinje, and ventricular cells.
            </Callout>
          ) : kMEqL < 3.5 ? (
            <Callout>
              ↓ [K⁺]out shifts EK more negative, making SA node maximum diastolic potential and working-cell resting
              Vm more negative. Repolarization can still slow as conductance through repolarizing K⁺ channels,
              especially I_Kr, falls. A small U wave analog appears after ventricular Phase 3.
            </Callout>
          ) : (
            <Callout>Extracellular [K⁺] is within the normal 3.5–5.0 mEq/L range — resting potential and repolarization are unaffected.</Callout>
          )}
          {caMgDl < 8.5 ? (
            <Callout>
              ↓ [Ca²⁺]out reduces trigger Ca²⁺ and twitch force. Weaker Ca²⁺ dependent inactivation allows the
              remaining I_Ca,L to persist longer, prolonging Phase 2 and AP duration.
            </Callout>
          ) : caMgDl > 10.5 ? (
            <Callout>
              ↑ [Ca²⁺]out increases trigger Ca²⁺ and twitch force. Stronger Ca²⁺ dependent inactivation helps
              terminate I_Ca,L sooner, shortening Phase 2 and AP duration.
            </Callout>
          ) : (
            <Callout>Extracellular [Ca²⁺] is within the normal 8.5–10.5 mg/dL range — the plateau duration is unaffected.</Callout>
          )}
        </div>

        {kMEqL >= 7.0 && (
          <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-700/40 text-xs text-red-300 font-medium">
            ⚠ Critical hyperkalemia — conduction severely impaired.
          </div>
        )}
      </div>

        </div>
      )}

      {/* Intracellular and mechanical teaching signals only */}
      <p className="mt-2 text-xs font-medium text-gray-300 text-center leading-relaxed">
        Membrane potential requires an intracellular electrode. Calcium and force are normalized teaching-model outputs, not clinical measurements.
      </p>
    </div>
  )
}

// ── 2C: What Does the ECG Actually Record? ─────────────────────────────────

// HeartAnimation reads clockRef.current.{tInCycle,cycleMs,nativeCycleMs} —
// nativeCycleMs/cycleMs are kept on the ref (not just closed over) so the
// SAME clock instance driving the AP/ECG canvases below can also drive the
// real conduction animation in sync.
function useLocalClock(cycleMs, nativeCycleMs = null, speed = 1) {
  const clockRef = useRef({ tInCycle: 0, cycleMs, nativeCycleMs })
  const [tMs, setTMs] = useState(0)
  const isPlayingRef = useRef(true)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    const previousCycleMs = clockRef.current.cycleMs
    const phaseFraction = previousCycleMs > 0 ? clockRef.current.tInCycle / previousCycleMs : 0
    const adjustedTime = clamp(phaseFraction * cycleMs, 0, cycleMs)
    clockRef.current.tInCycle = adjustedTime
    clockRef.current.cycleMs = cycleMs
    clockRef.current.nativeCycleMs = nativeCycleMs
    setTMs(Math.round(adjustedTime))
  }, [cycleMs, nativeCycleMs])

  useEffect(() => {
    let lastTs = null, raf
    const tick = (ts) => {
      if (isPlayingRef.current && lastTs !== null) {
        const dt = Math.min(ts - lastTs, 50) * speed
        const newT = (clockRef.current.tInCycle + dt) % cycleMs
        clockRef.current.tInCycle = newT
        setTMs(Math.round(newT))
      }
      lastTs = ts
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cycleMs, speed])

  const setPlaying = useCallback((v) => { isPlayingRef.current = v; setIsPlaying(v) }, [])
  const toggle = useCallback(() => setPlaying(!isPlayingRef.current), [setPlaying])
  const scrub = useCallback((ms) => { clockRef.current.tInCycle = ms; setTMs(ms) }, [])

  return { clockRef, tMs, isPlaying, toggle, setPlaying, scrub }
}

// Generic time-series canvas: draws valueAt(t) over xDomain, with an optional
// set of shaded phase bands and a cursor synced to clockRef's live position.
function TraceCanvas({
  clockRef,
  valueAt,
  xDomain,
  yDomain,
  color,
  phaseMarkers,
  bandLabels,
  referenceValueAt = null,
  referenceXMin = null,
  referenceXMax = null,
  height = 130,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const drawConfigRef = useRef(null)

  useEffect(() => {
    drawConfigRef.current = {
      valueAt,
      xDomain,
      yDomain,
      color,
      phaseMarkers,
      bandLabels,
      referenceValueAt,
      referenceXMin,
      referenceXMax,
    }
  }, [valueAt, xDomain, yDomain, color, phaseMarkers, bandLabels, referenceValueAt, referenceXMin, referenceXMax])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    const PAD = { l: 44, r: 10, t: 10, b: 18 }
    let W = 0

    const resize = () => {
      W = container.clientWidth || 300
      canvas.width = W * dpr
      canvas.height = height * dpr
      canvas.style.width = '100%'
      canvas.style.height = height + 'px'
    }
    resize()
    const ctx = canvas.getContext('2d')

    let rafId
    const frame = () => {
      const {
        valueAt: liveValueAt,
        xDomain: liveXDomain,
        yDomain: liveYDomain,
        color: liveColor,
        phaseMarkers: livePhaseMarkers,
        bandLabels: liveBandLabels,
        referenceValueAt: liveReferenceValueAt,
        referenceXMin: liveReferenceXMin,
        referenceXMax: liveReferenceXMax,
      } = drawConfigRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const dW = W - PAD.l - PAD.r
      const dH = height - PAD.t - PAD.b
      const [x0, x1] = liveXDomain
      const [yMin, yMax] = liveYDomain
      const toX = (t) => PAD.l + ((t - x0) / (x1 - x0)) * dW
      const toY = (v) => PAD.t + ((yMax - v) / (yMax - yMin)) * dH

      ctx.clearRect(0, 0, W, height)
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, W, height)

      if (livePhaseMarkers) {
        livePhaseMarkers.forEach(({ x0: px0, x1: px1, color: pc }) => {
          if (px1 < x0 || px0 > x1) return
          const rx = toX(Math.max(px0, x0)), rx2 = toX(Math.min(px1, x1))
          ctx.fillStyle = pc
          ctx.fillRect(rx, PAD.t, rx2 - rx, dH)
        })
      }

      // Small numeral drawn at the top of each phase band — e.g. the
      // ventricular panel's 0/1/2/3/4 phase numbers called out in the spec.
      if (liveBandLabels) {
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(226,232,240,0.65)'
        liveBandLabels.forEach(({ x, text }) => {
          if (x < x0 || x > x1) return
          ctx.fillText(text, toX(x), PAD.t + 11)
        })
      }

      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 0.5
      ctx.fillStyle = '#6b7280'
      ctx.font = '9px monospace'
      ctx.textAlign = 'left'
      const ySteps = 4
      for (let i = 0; i <= ySteps; i++) {
        const v = yMin + (i / ySteps) * (yMax - yMin)
        const y = toY(v)
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke()
        ctx.fillText(v.toFixed(Number.isInteger(v) ? 0 : 1), 4, y + 3)
      }

      if (liveReferenceValueAt) {
        ctx.strokeStyle = '#cbd5e1'
        ctx.lineWidth = 1.2
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        const referenceStart = Math.max(x0, liveReferenceXMin ?? x0)
        const referenceEnd = Math.min(x1, liveReferenceXMax ?? x1)
        if (referenceEnd > referenceStart) {
          const referenceN = Math.max(2, Math.round(220 * (referenceEnd - referenceStart) / (x1 - x0)))
          for (let i = 0; i <= referenceN; i++) {
            const t = referenceStart + (i / referenceN) * (referenceEnd - referenceStart)
            const v = Math.max(yMin, Math.min(yMax, liveReferenceValueAt(t)))
            const x = toX(t), y = toY(v)
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      ctx.strokeStyle = liveColor
      ctx.lineWidth = 1.8
      ctx.beginPath()
      const N = 220
      for (let i = 0; i <= N; i++) {
        const t = x0 + (i / N) * (x1 - x0)
        const v = Math.max(yMin, Math.min(yMax, liveValueAt(t)))
        const x = toX(t), y = toY(v)
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()

      const tNow = clockRef.current.tInCycle
      if (tNow >= x0 && tNow <= x1) {
        const cx = toX(tNow)
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 1
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(cx, PAD.t); ctx.lineTo(cx, height - PAD.b); ctx.stroke()
      }

      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, [height, clockRef])

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  )
}

function ElectrodeIcon() {
  return (
    <svg width="24" height="38" viewBox="0 0 26 42" style={{ display: 'block' }}>
      <rect x="15" y="0" width="9" height="9" rx="1.5" fill="#374151" stroke="#6b7280" />
      <line x1="20" y1="2" x2="4" y2="34" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
      <circle cx="4" cy="34" r="2.5" fill="#facc15" />
    </svg>
  )
}

// Draggable micropipette dropped directly onto the SAME heart illustration
// used by 1C's Conduction Animation (HeartAnimation), driven by the exact
// clock powering the AP/ECG graphs below — so the conduction sweep animates
// in sync with both traces rather than running on its own separate timer.
//
// Hit-testing and highlighting are deliberately decoupled for Purkinje.
//
// Highlighting still uses the REAL traced path: there's no shape drawn
// specifically labeled "Purkinje" in this illustration, but the conduction-
// bundle path (rbundle/lbundle — right/left halves of one shared shape
// reaching from the AV node area down through the fanning terminal branches
// at the apex) IS the His-Purkinje system, so it's tagged
// data-region="purkinje" in HeartAnimation.jsx and gets the same
// drop-shadow-on-real-geometry glow atrium/ventricle get.
//
// Hit-testing does NOT use that same real fill for Purkinje, though: once
// unclipped, that path's silhouette fans out across a large part of BOTH
// ventricle chambers (not just the septum), so testing against it kept
// registering "Purkinje" over a wide swath of what should read as
// "ventricle." Instead, Purkinje gets a small dedicated circular hit-zone
// positioned at the actual gap between the two measured ventricle boxes,
// biased toward their lower/apex side — and that circle is checked WITH
// PRIORITY, before ventricle's own exact-shape test, so landing in that gap
// always reads as Purkinje regardless of whether the ventricle's real shape
// also happens to cover the same point. SA/AV get the same small-circle,
// checked-with-priority treatment — both nodes sit physically inside the
// atrium's own illustrated area, and their real shapes are only a few px
// across anyway (too small to reliably drop onto), so a small dedicated
// circle checked before atrium's exact-shape test is both more forgiving
// and correctly wins there. Atrium (ra+la) and ventricle (rv+lv) themselves
// are tested against their real fill via isPointInFill() (each element's own
// getScreenCTM() inverse correctly maps the client point into that path's
// local space, including the extra scale(0.26458333) transform some of
// these paths carry).
// Scaled 1.6× along with the heart's own render size (200→320) so these
// hit-zones keep the same feel relative to the artwork instead of shrinking
// in proportion to it.
const NODE_RADIUS = 16        // sa / av circular targets — small and given priority
                               // over atrium below since both sit inside its area
const PURKINJE_RADIUS = 24    // smaller — its zone sits right at the ventricle
                               // boxes' edge, so a big circle bled into them
const REGION_PAD = 6          // outline padding beyond each measured atrium bbox
const VENTRICLE_SHRINK = 16   // ventricle's fallback box is inset by this much so it
                               // doesn't claim the septal gap / apex where Purkinje is
const HIT_TOLERANCE = 29      // how far outside any shape's edge still counts as a hit

function HeartDropTarget({ clockRef, rhythm, selectedRegion, onSelect }) {
  // The electrode is absolutely positioned relative to `stageRef` (the inner
  // W×H box), NOT the outer padded/centered container — so drag math must
  // use stageRef's own bounding rect too, or the electrode ends up offset
  // by however much the outer container is wider/centered than the stage.
  const stageRef = useRef(null)
  const [dragPos, setDragPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [hoverRegion, setHoverRegion] = useState(null)
  const [regionShapes, setRegionShapes] = useState(null)
  // Real DOM elements for atrium (ra+la) / ventricle (rv+lv) / purkinje
  // (rbundle+lbundle) — used both to hit-test against their TRUE traced
  // outline (not a bounding box) and to highlight that exact outline, so
  // "the boundary" is the real illustrated shape, not an approximation.
  const shapeElsRef = useRef({ atrium: [], ventricle: [], purkinje: [] })

  // Sized larger than the original 200×236 now that this component has a
  // full-width row to itself (see ECGVsAPSection) instead of sharing space
  // with the AP panel — same 200:236 aspect ratio, just scaled up 1.6×.
  const W = 320, H = 378
  const highlighted = hoverRegion || selectedRegion

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const stage = stageRef.current
      if (!stage) return
      shapeElsRef.current = {
        atrium: Array.from(stage.querySelectorAll('[data-region="atrium"]')),
        ventricle: Array.from(stage.querySelectorAll('[data-region="ventricle"]')),
        purkinje: Array.from(stage.querySelectorAll('[data-region="purkinje"]')),
      }

      const stageRect = stage.getBoundingClientRect()
      const groups = { sa: [], av: [], atrium: [], ventricle: [], purkinje: [] }
      stage.querySelectorAll('[data-region]').forEach(el => {
        const list = groups[el.dataset.region]
        if (!list) return
        const r = el.getBoundingClientRect()
        list.push({
          left: r.left - stageRect.left, right: r.right - stageRect.left,
          top: r.top - stageRect.top, bottom: r.bottom - stageRect.top,
        })
      })

      // sa/av: a single small element each — union their (one) box into a circle.
      const circleFrom = (boxes) => {
        if (!boxes.length) return null
        const left = Math.min(...boxes.map(b => b.left)), right = Math.max(...boxes.map(b => b.right))
        const top = Math.min(...boxes.map(b => b.top)), bottom = Math.max(...boxes.map(b => b.bottom))
        return { kind: 'circle', x: (left + right) / 2, y: (top + bottom) / 2, r: NODE_RADIUS }
      }
      // atrium/ventricle/purkinje boxes are kept ONLY as a forgiving near-miss
      // fallback for regionAt() below — not rendered — since the real shapes
      // (traced exactly via isPointInFill + a drop-shadow outline) do that job.
      const rectsFrom = (boxes, pad) => boxes.map(b => ({
        kind: 'rect',
        left: b.left - pad, right: b.right + pad,
        top: b.top - pad, bottom: b.bottom + pad,
      }))

      const sa = groups.sa.length ? [circleFrom(groups.sa)] : []
      const av = groups.av.length ? [circleFrom(groups.av)] : []
      const atrium = rectsFrom(groups.atrium, REGION_PAD)
      // Ventricle shrinks inward (rather than padding out) so its fallback
      // box doesn't reach into the septal gap between the two chambers or
      // down toward the apex — both of which should read as Purkinje.
      const ventricle = rectsFrom(groups.ventricle, -VENTRICLE_SHRINK)
      // Purkinje's real traced shape (rbundle/lbundle unclipped) turned out
      // to fan out across a large chunk of BOTH ventricles, not just the
      // septum — using its exact fill for hit-testing kept overlapping
      // ventricle over a wide area. So instead of testing that fill, its
      // hitbox is a small dedicated circle placed at the actual gap between
      // the two measured ventricle boxes, biased toward their lower/apex
      // side. The glow highlight still uses the real shape (unchanged) —
      // only what counts as "inside Purkinje" changed.
      let purkinje = []
      if (groups.ventricle.length) {
        const xs = groups.ventricle.map(b => (b.left + b.right) / 2)
        const x = xs.reduce((a, b) => a + b, 0) / xs.length
        const top = Math.min(...groups.ventricle.map(b => b.top))
        const bottom = Math.max(...groups.ventricle.map(b => b.bottom))
        const y = top + (bottom - top) * 0.72
        purkinje = [{ kind: 'circle', x, y, r: PURKINJE_RADIUS }]
      }

      setRegionShapes({ sa, av, atrium, ventricle, purkinje })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  // Distance from (x,y) to a shape's edge — 0 when the point is inside/on it.
  const distToShape = (x, y, shape) => {
    if (shape.kind === 'circle') return Math.max(0, Math.hypot(x - shape.x, y - shape.y) - shape.r)
    const dx = Math.max(shape.left - x, 0, x - shape.right)
    const dy = Math.max(shape.top - y, 0, y - shape.bottom)
    return Math.hypot(dx, dy)
  }

  // Exact test against the real artwork's own filled silhouette — each
  // element's getScreenCTM() already folds in its own transform (some of
  // these paths carry an extra scale(0.26458333)) plus every ancestor's, so
  // converting the client point through its inverse lands correctly in that
  // element's local path-data space regardless of how it's nested.
  const pathHit = (clientX, clientY, els) => {
    for (const el of els) {
      if (typeof el.isPointInFill !== 'function' || typeof el.getScreenCTM !== 'function') continue
      const ctm = el.getScreenCTM()
      const svg = el.ownerSVGElement
      if (!ctm || !svg) continue
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const local = pt.matrixTransform(ctm.inverse())
      if (el.isPointInFill(local)) return true
    }
    return false
  }

  const regionAt = useCallback((clientX, clientY) => {
    if (!regionShapes || !stageRef.current) return null
    const rect0 = stageRef.current.getBoundingClientRect()
    const lx = clientX - rect0.left, ly = clientY - rect0.top

    // SA/AV and Purkinje's dedicated hit-zones (small circles) are checked
    // FIRST, unconditionally, all ahead of atrium/ventricle's real-shape
    // tests. SA and AV physically sit inside the atrium's own illustrated
    // area, so without this an atrium drop would always win there before
    // the tiny node circles ever got a chance (same reasoning as Purkinje
    // vs. ventricle below). Being inside one of these small zones always
    // wins, regardless of whether atrium/ventricle's real shape also covers it.
    const saCircle = (regionShapes.sa || [])[0]
    if (saCircle && distToShape(lx, ly, saCircle) === 0) return 'sa'
    const avCircle = (regionShapes.av || [])[0]
    if (avCircle && distToShape(lx, ly, avCircle) === 0) return 'av'
    const purkCircle = (regionShapes.purkinje || [])[0]
    if (purkCircle && distToShape(lx, ly, purkCircle) === 0) return 'purkinje'

    // True-boundary hit against the real artwork takes priority over the
    // approximating shapes below (falls back gracefully if isPointInFill
    // isn't supported in this browser — shapeElsRef stays empty-checked).
    if (pathHit(clientX, clientY, shapeElsRef.current.atrium)) return 'atrium'
    if (pathHit(clientX, clientY, shapeElsRef.current.ventricle)) return 'ventricle'

    let best = null, bestDist = Infinity
    for (const key of ['sa', 'av', 'atrium', 'ventricle', 'purkinje']) {
      for (const shape of regionShapes[key] || []) {
        const d = distToShape(lx, ly, shape)
        if (d < bestDist) { bestDist = d; best = key }
      }
    }
    return bestDist <= HIT_TOLERANCE ? best : null
  }, [regionShapes])

  // Imperatively glow the REAL path(s) matching whichever region is
  // currently hovered/selected — a CSS drop-shadow filter follows the
  // element's actual alpha silhouette, so the highlight traces the true
  // organic boundary instead of any rectangle/circle approximation.
  useEffect(() => {
    const { atrium, ventricle, purkinje } = shapeElsRef.current
    const glow = 'drop-shadow(0 0 3px #22d3ee) drop-shadow(0 0 3px #22d3ee)'
    atrium.forEach(el => { el.style.filter = highlighted === 'atrium' ? glow : '' })
    ventricle.forEach(el => { el.style.filter = highlighted === 'ventricle' ? glow : '' })
    purkinje.forEach(el => { el.style.filter = highlighted === 'purkinje' ? glow : '' })
  })

  const handlePointerDown = (e) => {
    e.preventDefault()
    const rect = stageRef.current.getBoundingClientRect()
    setDragging(true)
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e) => {
      const rect = stageRef.current.getBoundingClientRect()
      setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      const hit = regionAt(e.clientX, e.clientY)
      setHoverRegion(hit)
      // Live-update the AP trace while dragging, not just on drop — onSelect
      // sets selectedRegion, which the AP panel reads directly.
      onSelect(hit)
    }
    const up = (e) => {
      setDragging(false)
      // Leave dragPos as-is — the electrode stays wherever it was dropped
      // instead of snapping back to its home corner.
      // Always call onSelect, even with null — dropping off every region
      // should clear the reading, not leave the previous one showing.
      onSelect(regionAt(e.clientX, e.clientY))
      setHoverRegion(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging, onSelect, regionAt])

  return (
    <div className="relative rounded-xl border border-gray-800 bg-gray-900/60 p-3 flex flex-col items-center">
      <div ref={stageRef} className="relative" style={{ width: W, height: H }}>
        <HeartAnimation clockRef={clockRef} rhythmId="normalSinusVoltage" rhythm={rhythm} width={W} height={H} />

        {/* SA/AV: a small circular hit-zone, drawn since there's no other
            visible affordance for these tiny shapes. Atrium/Ventricle/
            Purkinje get NO drawn overlay here — their highlight is the
            drop-shadow glow applied directly to the real paths above (see
            the effect that sets el.style.filter), so what lights up is the
            actual traced boundary, not an approximating shape. */}
        {regionShapes && ['sa', 'av'].flatMap((key) => {
          const active = highlighted === key
          return (regionShapes[key] || []).map((shape, i) => (
            <div
              key={`${key}-${i}`}
              className="absolute rounded-full pointer-events-none transition-colors"
              style={{
                left: shape.x - shape.r,
                top: shape.y - shape.r,
                width: shape.r * 2,
                height: shape.r * 2,
                background: active ? 'rgba(6,182,212,0.18)' : 'transparent',
                border: active ? '1.5px solid #22d3ee' : '1px dashed rgba(148,163,184,0.3)',
              }}
            />
          ))
        })}

        <div
          onPointerDown={handlePointerDown}
          className="absolute cursor-grab active:cursor-grabbing select-none"
          style={{
            left: dragPos ? dragPos.x - 12 : 2,
            top: dragPos ? dragPos.y - 12 : 2,
            touchAction: 'none',
            zIndex: 20,
            pointerEvents: dragging ? 'none' : 'auto',
          }}
          title="Drag onto a region of the heart"
        >
          <ElectrodeIcon />
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-2">
        {selectedRegion ? <>Recording from: <span className="text-cyan-300">{AP_REGIONS.find(r => r.key === selectedRegion)?.label}</span></> : 'Drag the electrode onto the heart'}
      </p>
    </div>
  )
}

function ECGVsAPSection({ rhythm }) {
  const cycleMs = rhythm.cycleMs || CYCLE_MS
  const { clockRef, tMs, isPlaying, toggle, setPlaying, scrub } = useLocalClock(cycleMs, rhythm.nativeCycleMs ?? null)
  const [selectedRegion, setSelectedRegion] = useState('ventricle')
  const [zoomed, setZoomed] = useState(false)

  const region = useMemo(() => AP_REGIONS.find(r => r.key === selectedRegion) || null, [selectedRegion])

  const apValueAt = useCallback((t) => {
    if (!region) return -80
    const f = region.anchorFraction + ((t - region.targetMs + cycleMs) % cycleMs) / cycleMs
    return interpAP(region.data, f)
  }, [region, cycleMs])

  // Deliberately uses cycleVoltage (a raw, unwarped sum of the wave
  // Gaussians at time t) instead of ECGVoltage — ECGVoltage runs its input
  // through warpTime() first, shifting the visible R-wave peak by up to
  // ~40ms in a way that drifts continuously against the clock, which would
  // be a second, independent source of desync against the animation on top
  // of the one below.
  //
  // The QRS complex (Q/R/S — the ventricular portion) is shifted later by
  // VENTRICULAR_ANIM_DELAY_MS so it lines up with HeartAnimation's own
  // delayed ventricular fill (see that constant's comment) — same idea as
  // the ventricle AP anchor above. P and T stay at their true time: the
  // animation's atrial flash and repolarization sweep aren't delayed the
  // same way, so shifting them would just trade one desync for another.
  const shiftedWaves = useMemo(() => (
    (rhythm.waves || []).map(w => (
      (w.name === 'Q' || w.name === 'R' || w.name === 'S')
        ? { ...w, center: w.center + VENTRICULAR_ANIM_DELAY_MS }
        : w
    ))
  ), [rhythm.waves])

  const ecgValueAt = useCallback((t) => {
    if (shiftedWaves.length === 0) return 0
    return cycleVoltage(t, shiftedWaves, 60)
  }, [shiftedWaves])

  // Both use the SHIFTED position (matching shiftedWaves/the ventricle AP
  // anchor above), so "Zoom to QRS" centers on where the R wave actually
  // appears on this trace, not its pre-shift value.
  const rWave = useMemo(() => shiftedWaves.find(w => w.name === 'R'), [shiftedWaves])
  const rWaveCenter = rWave ? rWave.center : QRS_ONSET_MS + VENTRICULAR_ANIM_DELAY_MS + 38

  const xDomain = useMemo(
    () => (zoomed
      ? [Math.max(0, QRS_ONSET_MS + VENTRICULAR_ANIM_DELAY_MS - 60), QRS_ONSET_MS + VENTRICULAR_ANIM_DELAY_MS + 160]
      : [0, cycleMs]),
    [zoomed, cycleMs]
  )
  const apMarkers = useMemo(
    () => (region ? phasesToMarkers(region.phases, region.anchorFraction, region.targetMs, cycleMs) : []),
    [region, cycleMs]
  )

  const handleZoom = useCallback(() => {
    if (zoomed) { setZoomed(false); return }
    setSelectedRegion('ventricle')
    setPlaying(false)
    scrub(rWaveCenter)
    setZoomed(true)
  }, [zoomed, setPlaying, scrub, rWaveCenter])

  return (
    <div>
      {/* TOP — the heart itself: drag the electrode here */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 flex flex-col items-center">
        <p className="text-xs text-gray-500 mb-3 text-center max-w-md">
          Drag the electrode onto the heart below to record from that region — the two traces underneath update to show what that electrode (left) and the body surface (right) each see, simultaneously.
        </p>
        <HeartDropTarget
          clockRef={clockRef}
          rhythm={rhythm}
          selectedRegion={selectedRegion}
          onSelect={(key) => { setSelectedRegion(key); setZoomed(false) }}
        />
      </div>

      {/* BELOW — the two traces, side by side */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch mt-3">
        {/* LEFT — Intracellular (AP) trace */}
        <div className="flex-1 min-w-0 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h3 className="text-sm font-semibold text-white mb-1">Intracellular Recording</h3>
          <p className="text-xs text-gray-500 mb-3">Voltage across ONE cell's membrane — requires a microelectrode inside the cell.</p>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-300">
              {region ? `${region.label} action potential` : 'No electrode placed'}
            </span>
            <span className="text-[10px] text-gray-500">Membrane Potential (mV)</span>
          </div>
          <TraceCanvas
            clockRef={clockRef}
            valueAt={apValueAt}
            xDomain={xDomain}
            yDomain={AP_Y_DOMAIN}
            color="#34d399"
            phaseMarkers={apMarkers}
          />
          {region && <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{region.desc}</p>}
        </div>

        {/* SEPARATOR */}
        <div className="flex lg:flex-col items-center justify-center gap-2 lg:w-10 shrink-0 py-1">
          <span className="text-2xl text-gray-600 font-bold">≠</span>
          <span className="text-[10px] text-gray-600 text-center leading-tight max-w-[90px]">
            These are not the same signal
          </span>
        </div>

        {/* RIGHT — ECG trace */}
        <div className="flex-1 min-w-0 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h3 className="text-sm font-semibold text-white mb-1">ECG Recording (Body Surface)</h3>
          <p className="text-xs text-gray-500 mb-3">Net dipole moment of the entire heart, viewed from outside the body.</p>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold text-blue-300">Lead II — surface trace</span>
            <span className="text-[10px] text-gray-500">Body Surface Voltage Difference (mV)</span>
          </div>
          <TraceCanvas
            clockRef={clockRef}
            valueAt={ecgValueAt}
            xDomain={xDomain}
            yDomain={ECG_Y_DOMAIN}
            color="#60a5fa"
          />
          <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
            Left: voltage across one cell membrane (intracellular electrode required). Right: net dipole moment of the entire heart, summed across billions of cells, viewed from outside the body.
          </p>
        </div>
      </div>

      {/* Controls — shared clock drives both traces */}
      <div className="flex items-center gap-3 flex-wrap mt-3">
        <button
          onClick={toggle}
          className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={xDomain[0]}
          max={xDomain[1]}
          value={Math.min(Math.max(tMs, xDomain[0]), xDomain[1])}
          onChange={e => scrub(Number(e.target.value))}
          className="flex-1 min-w-[120px] accent-emerald-500"
        />
        <span className="text-xs font-mono text-gray-500 tabular-nums w-24">{Math.round(tMs)} / {cycleMs} ms</span>
        <button
          onClick={handleZoom}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            zoomed
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
              : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
          }`}
        >
          {zoomed ? 'Exit Zoom' : 'Zoom to QRS'}
        </button>
      </div>

      {zoomed && (
        <div className="mt-2 rounded-lg bg-emerald-950/40 border border-emerald-700/40 px-3 py-2 text-xs text-emerald-300 leading-relaxed">
          At the peak of the R wave (t ≈ {Math.round(rWaveCenter)} ms), the ventricular myocyte is in <strong>Phase 2 — the plateau</strong>, not at the peak of its own upstroke. The AP upstroke happens well before the R wave peaks.
        </div>
      )}

      {/* Misconception callout */}
      <div className="mt-4 rounded-lg bg-amber-950/30 border border-amber-700/40 px-4 py-3 text-xs text-amber-200 leading-relaxed">
        <strong>⚠ Common Misconception:</strong> The ECG does not show membrane potential. The upstroke of the R wave
        does not correspond to the upstroke of the action potential. The ECG captures the spatial derivative of the
        extracellular potential — the dipole field — summed across billions of cells. No single cell's membrane
        potential can be read from an ECG. An intracellular microelectrode is required for that measurement.
      </div>
    </div>
  )
}

// ── 1C: Conduction Animation ────────────────────────────────────────────────
// Owns its own clock now that 1C is a standalone tab, never mounted
// alongside 2E — they used to share one master clock via props from the
// top-level CardiacBridge component; now each tab gets its own via the
// same useLocalClock hook 2C already uses.
function ConductionSection({ rhythm }) {
  const cycleMs = rhythm.cycleMs || CYCLE_MS
  const [speed, setSpeed] = useState(0.1)
  const { clockRef, tMs, isPlaying, toggle, scrub } = useLocalClock(cycleMs, rhythm.nativeCycleMs ?? null, speed)
  const stage = getTeachingConductionStage(tMs, cycleMs)
  const activeVelocityRows = {
    sa: ['SA Node'],
    atria: ['Atrial myocardium'],
    av: ['AV Node'],
    his: ['Bundle of His'],
    purkinje: ['Bundle Branches', 'Purkinje Fibers'],
    ventricles: ['Ventricular muscle'],
  }[stage.id] || []

  const velTable = [
    { struct: 'SA Node',             cv: '—' },
    { struct: 'Atrial myocardium',   cv: '1.0 m/s' },
    { struct: 'AV Node',             cv: '0.05 m/s' },
    { struct: 'Bundle of His',       cv: '1.0 m/s' },
    { struct: 'Bundle Branches',     cv: '2–4 m/s' },
    { struct: 'Purkinje Fibers',     cv: '2–4 m/s' },
    { struct: 'Ventricular muscle',  cv: '0.3–0.5 m/s' },
  ]

  return (
    <div>
      <div className="mb-4 rounded-xl border border-cyan-800/60 bg-gray-900/80 p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Playback and conduction sequence position</h3>
          <p className="text-xs text-gray-300">Use Study rate to read each stage; use Real time to appreciate the physiological pace.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggle}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-cyan-700 bg-cyan-950/60 hover:bg-cyan-900/60 text-white transition-colors"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => scrub((clockRef.current.tInCycle + 10) % cycleMs)}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
          >
            +10 ms
          </button>
          <button
            onClick={() => scrub(0)}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
          >
            Reset position
          </button>
          <span className="ml-auto text-xs font-mono font-medium text-gray-200 tabular-nums">{Math.round(tMs)} / {Math.round(cycleMs)} ms</span>
        </div>

        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={cycleMs}
            value={Math.round(tMs)}
            onChange={e => scrub(Number(e.target.value))}
            aria-label="Cardiac conduction sequence position"
            className="w-full accent-cyan-500"
          />
          <div className="relative mt-2 hidden h-8 text-xs font-medium leading-tight text-gray-300 sm:block">
            {[
              ['Atrial activation', '11.8%'],
              ['AV delay', '26%'],
              ['His–Purkinje', '41.5%'],
              ['Ventricular activation', '57.5%'],
              ['Repolarization', '78%'],
            ].map(([label, left]) => (
              <span key={label} className="absolute w-28 -translate-x-1/2 text-center" style={{ left }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-700 pt-2">
          <span className="text-xs font-semibold text-gray-200">Animation rate</span>
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              aria-label={`Set animation to ${playbackRateLabel(s)}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                speed === s
                  ? 'bg-cyan-950/60 text-cyan-200 border-cyan-600'
                  : 'bg-gray-800 text-gray-200 border-gray-600 hover:border-gray-400 hover:text-white'
              }`}
            >
              {playbackRateLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start mb-4">
        <div className="relative rounded-xl border border-gray-800 overflow-hidden shrink-0 max-w-full">
          <TeachingConductionAnimation timeMs={tMs} cycleMs={cycleMs} />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 min-h-[166px]">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1">Current stage</div>
            <div className="text-lg font-semibold text-white min-h-[28px]">{stage.label}</div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-300">Participating structures</div>
            <div className="mt-1 text-sm text-emerald-300 min-h-[20px]">{stage.structures}</div>
            <div className="mt-3 min-h-[4.5rem]">
              <p className="text-sm text-gray-200 leading-relaxed">{stage.note}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="text-xs font-semibold text-gray-300 mb-2 font-mono uppercase tracking-wider">Conduction velocity reference</div>
            <table className="w-full text-sm">
              <tbody>
                {velTable.map(row => (
                  <tr key={row.struct} className={activeVelocityRows.includes(row.struct) ? 'font-semibold text-cyan-200' : 'text-gray-200'}>
                    <td className="py-0.5 pr-3">{row.struct}</td>
                    <td className="py-0.5 font-mono text-right">{row.cv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 border-t border-gray-700 pt-2 text-xs leading-relaxed text-gray-300">
              Reference ranges describe tissue conduction. Pixel distance and animation speed do not represent measured velocity.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber-600/60 bg-amber-950/20 px-3 py-2 text-sm leading-relaxed text-amber-100">
        <strong>Teaching schematic:</strong> The sequence and major directions are physiologically guided. Shapes, distances,
        front positions, and elapsed screen time are not a quantitative activation map.
      </div>
    </div>
  )
}

function gaussianV(t, amplitude, center, sigma) {
  return amplitude * Math.exp(-((t - center) ** 2) / (2 * sigma ** 2))
}
function projFactor(sourceAxisDeg, leadAxisDeg) {
  return Math.cos(((sourceAxisDeg - leadAxisDeg) * Math.PI) / 180)
}
// Same delay applied to the ventricular animation (HeartAnimation's
// normalSinusVoltage continuousDelay) so the vector's QRS-driven spike stays
// in sync with the now-delayed ventricular sweep instead of leading it —
// only Q/R/S are shifted; P and T keep their own natural timing.
const VENTRICLE_VECTOR_DELAY_MS = 40
function delayedVoltage(t, waves, leadAxisDeg) {
  return waves.reduce((sum, wave) => {
    const delay = (wave.name === 'Q' || wave.name === 'R' || wave.name === 'S') ? VENTRICLE_VECTOR_DELAY_MS : 0
    const axis = wave.axisDeg ?? 0
    return sum + gaussianV(t - delay, wave.amplitude, wave.center, wave.sigma) * projFactor(axis, leadAxisDeg)
  }, 0)
}

// ── Cardiac vector overlay — toggleable, drawn on top of the real heart SVG ──
// Anchor point and SCALE are first-draft estimates for where the ventricular
// mass sits within HeartAnimation's rendered box — nudge these after seeing
// it rendered if the arrow doesn't sit where expected.
function CardiacVectorOverlay({ clockRef, waves, cycleMs, width = 280, height = 330 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const anchorX = width * 0.52
    const anchorY = height * 0.62
    const SCALE = 34

    let rafId
    const frame = () => {
      const { tInCycle } = clockRef.current
      ctx.clearRect(0, 0, width, height)

      if (waves && waves.length > 0) {
        const Vx = delayedVoltage(tInCycle, waves, 0)
        const Vy = delayedVoltage(tInCycle, waves, 90)
        const mag = Math.hypot(Vx, Vy)

        if (mag > 0.02) {
          const tipX = anchorX + Vx * SCALE
          const tipY = anchorY + Vy * SCALE
          ctx.strokeStyle = '#34d399'
          ctx.fillStyle = '#34d399'
          ctx.lineWidth = 2.5
          ctx.lineCap = 'round'
          ctx.shadowColor = '#34d399'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.moveTo(anchorX, anchorY)
          ctx.lineTo(tipX, tipY)
          ctx.stroke()
          ctx.shadowBlur = 0

          const angle = Math.atan2(tipY - anchorY, tipX - anchorX)
          const hLen = 9
          ctx.beginPath()
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(tipX - hLen * Math.cos(angle - 0.4), tipY - hLen * Math.sin(angle - 0.4))
          ctx.lineTo(tipX - hLen * Math.cos(angle + 0.4), tipY - hLen * Math.sin(angle + 0.4))
          ctx.closePath()
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(anchorX, anchorY, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(52,211,153,0.6)'
        ctx.fill()
      }

      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [clockRef, waves, cycleMs, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width, height, pointerEvents: 'none' }}
    />
  )
}

// ── 2E: Cardiac Vector Cycle ───────────────────────────────────────────────
// Owns its own clock + controls now that 2E is a standalone tab — it used
// to be silently driven by 1C's master clock (no controls of its own at
// all). Same useLocalClock hook 1C uses; this component was never
// internally rAF-driven anyway (it repaints via p5's redraw() whenever
// dataRef's effect fires), so swapping the time source in is a clean drop-in.
function VectorCycle({ rhythm }) {
  const cycleMs = rhythm.cycleMs || CYCLE_MS
  const waves = rhythm.waves
  const { tMs: currentTimeMs, isPlaying, toggle, scrub } = useLocalClock(cycleMs, rhythm.nativeCycleMs ?? null)
  const containerRef = useRef()
  const p5InstRef = useRef(null)
  const dataRef = useRef({ waves, cycleMs, currentTimeMs })

  // Update data then immediately trigger one draw — avoids rAF timing race
  useEffect(() => {
    dataRef.current = { waves, cycleMs, currentTimeMs }
    p5InstRef.current?.redraw()
  }, [waves, cycleMs, currentTimeMs])

  useEffect(() => {
    // RENDER_SCALE shrinks the actual rendered canvas without touching any
    // of the hand-placed layout constants below (VCX/VCY/VR/EX/EY/etc, W,
    // H — all stay the original 520×300 logical values every existing draw
    // call already uses). Only the real <canvas> pixel size (CW/CH) is
    // smaller; p.draw() wraps its body in p.scale(RENDER_SCALE) so the
    // logical-space drawing lands correctly on the smaller physical canvas
    // — same technique used in LeadPlacementLab for the same reason.
    const RENDER_SCALE = 0.8
    const W = 520, H = 300
    const CW = Math.round(W * RENDER_SCALE), CH = Math.round(H * RENDER_SCALE)
    const VCX = 115, VCY = 155, VR = 85
    const EX = 248, EW = 255, EY = 80, EH = 160

    const sketch = (p) => {
      let ECGCache = null
      let waveRegions = null

      const buildCache = (w, cm) => {
        if (!w || !cm) return []
        const N = 400
        return Array.from({ length: N }, (_, i) => ECGVoltage((i / N) * cm, cm, w, 60))
      }

      const buildRegions = (w, cm) => {
        if (!w) return []
        const regions = []
        const pWave = w.find(wv => wv.name === 'P')
        const qrsR = w.find(wv => wv.name === 'R')
        const tWave = w.find(wv => wv.name === 'T')
        if (pWave) {
          const s = pWave.center - pWave.sigma * 2.5
          const e = pWave.center + pWave.sigma * 2.5
          regions.push({ label: 'P', color: [59, 130, 246], start: Math.max(0, s), end: Math.min(cm, e) })
        }
        if (qrsR) {
          const s = qrsR.center - 60
          const e = qrsR.center + 60
          regions.push({ label: 'QRS', color: [139, 92, 246], start: Math.max(0, s), end: Math.min(cm || 800, e) })
        }
        if (tWave) {
          const s = tWave.center - tWave.sigma * 2.5
          const e = tWave.center + tWave.sigma * 2.5
          regions.push({ label: 'T', color: [245, 158, 11], start: Math.max(0, s), end: Math.min(cm || 800, e) })
        }
        return regions
      }

      p.setup = () => {
        const cnv = p.createCanvas(CW, CH)
        cnv.elt.style.width = '100%'
        cnv.elt.style.height = 'auto'
        cnv.elt.style.display = 'block'
        // Backing buffer must have enough real pixels for the CSS-stretched
        // display size (plus device pixel ratio) or the upscale looks blurry.
        const rectW = cnv.elt.getBoundingClientRect().width || CW
        const density = Math.min(3, Math.max(1, rectW / CW) * (window.devicePixelRatio || 1))
        p.pixelDensity(density)
        cnv.elt.style.width = '100%'
        cnv.elt.style.height = 'auto'
        cnv.elt.style.display = 'block'
        p.noLoop()  // driven by redraw() calls, not the internal 60fps loop
      }

      p.draw = () => {
        p.background(17, 24, 39)
        p.push()
        p.scale(RENDER_SCALE)
        const { waves: w, cycleMs: cm, currentTimeMs: tMs } = dataRef.current

        if (!ECGCache || ECGCache.length === 0) ECGCache = buildCache(w, cm)
        if (!waveRegions) waveRegions = buildRegions(w, cm)

        const Vx = (w && cm) ? ECGVoltage(tMs, cm, w, 0) : 0
        const Vy = (w && cm) ? ECGVoltage(tMs, cm, w, 90) : 0
        const mag = Math.sqrt(Vx * Vx + Vy * Vy)
        const angle = Math.atan2(Vy, Vx)

        // ── Left panel: Vector wheel ──
        p.noStroke()
        p.fill(22, 30, 46)
        p.rect(0, 0, 230, H)

        p.noStroke()
        p.fill(100, 116, 139)
        p.textSize(8)
        p.textAlign(p.CENTER)
        p.text('Cardiac Vector (frontal plane)', VCX, 20)

        // Limb lead axes (dashed)
        const leads = [
          { label: 'I',    angle: 0 },
          { label: 'II',   angle: Math.PI / 3 },
          { label: 'III',  angle: 2 * Math.PI / 3 },
          { label: 'aVR',  angle: -2 * Math.PI / 3 },
          { label: 'aVL',  angle: -Math.PI / 3 },
          { label: 'aVF',  angle: Math.PI / 2 },
        ]
        leads.forEach(({ label, angle: la }) => {
          p.stroke(45, 55, 72)
          p.strokeWeight(0.8)
          p.drawingContext.setLineDash([3, 3])
          const ex = VCX + Math.cos(la) * VR, ey = VCY + Math.sin(la) * VR
          const sx = VCX - Math.cos(la) * VR, sy = VCY - Math.sin(la) * VR
          p.line(sx, sy, ex, ey)
          p.drawingContext.setLineDash([])
          p.noStroke()
          p.fill(75, 85, 99)
          p.textSize(7)
          p.textAlign(p.CENTER)
          const lx = VCX + Math.cos(la) * (VR + 12), ly = VCY + Math.sin(la) * (VR + 12)
          p.text(label, lx, ly + 2)
        })

        // Wheel circle
        p.noFill()
        p.stroke(40, 50, 65)
        p.strokeWeight(0.8)
        p.circle(VCX, VCY, VR * 2)

        // Lead I projection (blue dashed on x-axis)
        const projLen = Vx * VR  // dot with unit [1,0]
        p.stroke(59, 130, 246, 120)
        p.strokeWeight(1)
        p.drawingContext.setLineDash([2, 2])
        p.line(VCX + projLen, VCY - 6, VCX + projLen, VCY + 6)
        p.line(VCX, VCY, VCX + projLen, VCY)
        p.drawingContext.setLineDash([])

        // Cardiac vector arrow
        if (mag > 0.005) {
          const VSCALE = VR * 1.0
          const ax = Math.cos(angle) * mag * VSCALE
          const ay = Math.sin(angle) * mag * VSCALE
          p.stroke(52, 211, 153)
          p.strokeWeight(2.2)
          p.line(VCX, VCY, VCX + ax, VCY + ay)
          const hLen = 8
          p.fill(52, 211, 153)
          p.noStroke()
          p.triangle(
            VCX + ax, VCY + ay,
            VCX + ax - hLen * Math.cos(angle - 0.4), VCY + ay - hLen * Math.sin(angle - 0.4),
            VCX + ax - hLen * Math.cos(angle + 0.4), VCY + ay - hLen * Math.sin(angle + 0.4)
          )
        }
        // Mean QRS axis arrow — bold, bright yellow, distinct from the
        // rotating emerald instantaneous vector above.
        if (w && w.length > 0) {
          const { angleDeg: meanAngle, leadINet, leadAVFNet } = meanQRSAxis(w)
          const meanMag = Math.min(1, Math.hypot(leadINet, leadAVFNet))
          const meanRad = (meanAngle * Math.PI) / 180
          const max = Math.cos(meanRad) * meanMag * VR
          const may = Math.sin(meanRad) * meanMag * VR
          p.stroke(250, 204, 21)
          p.strokeWeight(3.5)
          p.line(VCX, VCY, VCX + max, VCY + may)
          const mhLen = 9
          p.fill(250, 204, 21)
          p.noStroke()
          p.triangle(
            VCX + max, VCY + may,
            VCX + max - mhLen * Math.cos(meanRad - 0.4), VCY + may - mhLen * Math.sin(meanRad - 0.4),
            VCX + max - mhLen * Math.cos(meanRad + 0.4), VCY + may - mhLen * Math.sin(meanRad + 0.4)
          )
          p.fill(250, 204, 21)
          p.textSize(7)
          p.textAlign(p.CENTER)
          p.text(`Mean QRS Axis ${meanAngle >= 0 ? '+' : ''}${meanAngle.toFixed(0)}°`, VCX, VCY + VR + 16)
        }

        p.fill(200, 200, 200)
        p.noStroke()
        p.circle(VCX, VCY, 5)

        // ── Right panel: ECG strip (Lead II) ──
        p.noStroke()
        p.fill(22, 30, 46)
        p.rect(235, 0, W - 235, H)

        p.fill(100, 116, 139)
        p.textSize(8)
        p.textAlign(p.CENTER)
        p.text('Lead II ECG', EX + EW / 2, 20)

        // Wave region shading
        if (waveRegions) {
          waveRegions.forEach(({ label, color, start, end }) => {
            const rx = EX + (start / (cm || CYCLE_MS)) * EW
            const rw = ((end - start) / (cm || CYCLE_MS)) * EW
            p.fill(color[0], color[1], color[2], 30)
            p.noStroke()
            p.rect(rx, EY, rw, EH)
            p.fill(color[0], color[1], color[2], 150)
            p.textSize(7)
            p.textAlign(p.CENTER)
            p.text(label, rx + rw / 2, EY + 10)
          })
        }

        // ECG grid
        p.stroke(40, 50, 65)
        p.strokeWeight(0.5)
        p.line(EX, EY, EX + EW, EY)
        p.line(EX, EY + EH, EX + EW, EY + EH)
        p.line(EX, EY + EH / 2, EX + EW, EY + EH / 2)
        p.strokeWeight(0.4)
        for (let xi = 0; xi <= 4; xi++) {
          p.line(EX + xi * EW / 4, EY, EX + xi * EW / 4, EY + EH)
        }

        // ECG curve
        if (ECGCache && ECGCache.length > 0) {
          const maxV = Math.max(...ECGCache.map(Math.abs)) || 1
          p.stroke(52, 211, 153)
          p.strokeWeight(1.8)
          p.noFill()
          p.beginShape()
          const f0 = ECGCache[0]
          p.curveVertex(EX, EY + EH / 2 - (f0 / maxV) * (EH / 2 - 8))
          ECGCache.forEach((v, i) => {
            const px = EX + (i / ECGCache.length) * EW
            const py = EY + EH / 2 - (v / maxV) * (EH / 2 - 8)
            p.curveVertex(px, py)
          })
          const fn = ECGCache[ECGCache.length - 1]
          p.curveVertex(EX + EW, EY + EH / 2 - (fn / maxV) * (EH / 2 - 8))
          p.endShape()
        }

        // Current time marker
        const markerX = EX + ((tMs % (cm || CYCLE_MS)) / (cm || CYCLE_MS)) * EW
        p.stroke(250, 250, 250, 130)
        p.strokeWeight(1)
        p.drawingContext.setLineDash([3, 3])
        p.line(markerX, EY, markerX, EY + EH)
        p.drawingContext.setLineDash([])

        // T-wave annotation
        p.noStroke()
        p.fill(103, 232, 249)
        p.textSize(7)
        p.textAlign(p.CENTER)
        p.text('T wave: repol travels epi→endo', EX + EW / 2, EY + EH + 18)
        p.text('→ same polarity as QRS in Lead I/II', EX + EW / 2, EY + EH + 28)

        // Time readout
        p.fill(75, 85, 99)
        p.textSize(7)
        p.textAlign(p.LEFT)
        p.text(`t = ${Math.round(tMs)} ms`, EX, H - 8)
        p.pop()
      }
    }

    const container = containerRef.current
    if (!container) return
    let inst
    const rafId = requestAnimationFrame(() => {
      if (!container.isConnected) return
      while (container.firstChild) container.removeChild(container.firstChild)
      inst = new p5(sketch, container)
      p5InstRef.current = inst
    })
    return () => {
      cancelAnimationFrame(rafId)
      p5InstRef.current = null
      if (inst) { try { inst.remove() } catch (_) {} }
      while (container.firstChild) container.removeChild(container.firstChild)
    }
  }, [])  // mount once — data comes in via dataRef + redraw()

  return (
    <div>
      <CanvasWrap containerRef={containerRef}>
        <SimBar>
          <span>Left: cardiac vector rotating through P-QRS-T · Right: Lead II strip with current position marker</span>
        </SimBar>
      </CanvasWrap>
      <div className="flex items-center gap-3 flex-wrap mt-3">
        <button
          onClick={toggle}
          className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => scrub(0)}
          className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          Reset
        </button>
        <input
          type="range"
          min={0}
          max={cycleMs}
          value={Math.round(currentTimeMs)}
          onChange={e => scrub(Number(e.target.value))}
          className="flex-1 min-w-[120px] accent-cyan-500"
        />
        <span className="text-xs font-mono text-gray-500 tabular-nums w-20">{Math.round(currentTimeMs)} / {cycleMs} ms</span>
      </div>
    </div>
  )
}

const MODULE1_TABS = [
  { id: '1A', label: '1A · Cardiac Anatomy', shortLabel: 'Cardiac anatomy' },
  { id: '1B', label: '1B · Action Potentials', shortLabel: 'Action potentials' },
  { id: '1C', label: '1C · Conduction', shortLabel: 'Conduction' },
]

// ── Main export ────────────────────────────────────────────────────────────
export default function CardiacBridge() {
  const rhythm = useMemo(() => {
    try {
      return buildRhythmFromParams(DEFAULT_RHYTHM_PARAMS)
    } catch {
      return { waves: [], cycleMs: CYCLE_MS, nativeCycleMs: null }
    }
  }, [])

  const [selected1A, setSelected1A] = useState(null)

  const { active, visited, setActive } = useTabState('cardiac', MODULE1_TABS.map(t => t.id))
  // Tabs now render as a sub-menu in the sidebar (see Sidebar.jsx) instead
  // of an in-page pill bar — this just publishes the same state there.
  usePublishTabs('cardiac', MODULE1_TABS, { active, visited, setActive })

  return (
    <ModulePage
      moduleId="cardiac"
      number={1}
      title="Cardiac Action Potentials"
      wide={active === '1B'}
    >
      {active === '1A' && (
        <Section
          label="1A"
          title="Heart Anatomy Overview"
          subtitle="Hover or click any structure to see its primary function and electrical behavior."
        >
          <AnatomyDiagram selected={selected1A} onSelect={setSelected1A} />
          <Callout>
            The SA node is the heart's primary pacemaker — it fires spontaneously without any external trigger.
            The AV node imposes a deliberate delay that allows ventricular filling before systole. The
            His-Purkinje system then accelerates conduction to near-simultaneous ventricular activation.
          </Callout>
        </Section>
      )}

      {active === '1B' && (
        <Section
          label="1B"
          title="Action Potentials by Cell Type"
          subtitle="Compare action potential shapes, follow their activation sequence, and use channel contributions to predict how each cell will respond."
        >
          <LiveActionPotentials />
          <Callout>
            SA node and AV node use <strong>slow response</strong> action potentials (I_Ca,L upstroke, ~0.05 m/s).
            Atrial and ventricular myocytes use <strong>fast response</strong> action potentials (I_Na upstroke, 1 m/s).
            Purkinje fibers have the fastest upstroke (highest dV/dt), longest plateau, and act as tertiary
            pacemakers (20–40 bpm) if SA and AV nodes both fail.
          </Callout>
        </Section>
      )}

      {active === '1C' && (
        <Section
          label="1C"
          title="Conduction Animation"
          subtitle="Follow a physiologically guided schematic of activation and recovery. Use the scrubber to examine each stage of the cardiac cycle."
        >
          <ConductionSection rhythm={rhythm} />
          <Callout>
            The AV node is the rate-limiting step at 0.05 m/s — 20× slower than atrial muscle.
            Once past the AV node, the His-Purkinje system accelerates conduction 40–80× faster than myocardium,
            producing rapid, near-synchronous endocardial activation across both ventricles.
          </Callout>
        </Section>
      )}

    </ModulePage>
  )
}
