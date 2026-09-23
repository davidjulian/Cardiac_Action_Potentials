import { buildSACurrentCurves, sampleEnvelope } from './saCurrentExplorer.js'

// Teaching envelopes only. They are independently normalized, not a current
// balance calculation, and must never be summed to claim they generate Vm.
const between = (a, b, f) => a + (b - a) * f
const metadata = {
  INa: ['Na', 'Fast voltage-gated Na⁺ channels', 'Fast sodium current', '#60a5fa', 'inward'],
  ICaL: ['Ca,L', 'L-type Ca²⁺ channels', 'L-type calcium current', '#fbbf24', 'inward'],
  Ito: ['to', 'Transient outward K⁺ channels', 'Transient outward current', '#fb923c', 'outward'],
  IKur: ['Kur', 'Kv1.5 channels', 'Ultra-rapid delayed rectifier', '#e879f9', 'outward'],
  IKr: ['Kr', 'hERG / Kv11.1 channels', 'Rapid delayed rectifier', '#fb7185', 'outward'],
  IKs: ['Ks', 'Kv7.1 / KCNE1 channels', 'Slow delayed rectifier', '#f472b6', 'outward'],
  IK1: ['K1', 'Kir2.x channels', 'Inward rectifier K⁺ current', '#a3e635', 'outward'],
  If: ['f', 'HCN channels', 'Mixed Na⁺/K⁺ current', '#a78bfa', 'inward'],
}

function curve(id, knots) {
  const [subscript, channel, detail, color, direction] = metadata[id]
  return { id, subscript, channel, detail, color, direction, label: `I_${subscript}`, knots }
}

export function buildFastCurrentCurves(kind, phases) {
  const bounds = id => phases.find(p => p.id === id).tRange
  const [start, peak] = bounds('p0')
  const [, notch] = bounds('p1')
  const [, plateauEnd] = bounds('p2')
  const [, repolEnd] = bounds('p3')
  const curves = [
    curve('INa', [[0, 0], [start, 0], [between(start, peak, .45), -1], [peak, -.10], [notch, 0], [1, 0]]),
    curve('ICaL', [[0, 0], [between(start, peak, .4), 0], [notch, -1],
      [between(notch, plateauEnd, .5), -.65], [plateauEnd, -.25], [between(plateauEnd, repolEnd, .45), 0], [1, 0]]),
    curve('Ito', [[0, 0], [between(start, peak, .55), 0], [between(peak, notch, .4), 1],
      [notch, .65], [between(notch, plateauEnd, .3), 0], [1, 0]]),
  ]
  if (kind === 'atrium') curves.push(curve('IKur', [[0, 0], [start, 0], [notch, 1],
    [plateauEnd, .6], [between(plateauEnd, repolEnd, .8), 0], [1, 0]]))
  curves.push(
    curve('IKr', [[0, 0], [peak, 0], [notch, .12], [plateauEnd, .4],
      [between(plateauEnd, repolEnd, .45), 1], [repolEnd, .10], [between(repolEnd, 1, .3), 0], [1, 0]]),
    curve('IKs', [[0, 0], [peak, 0], [notch, .06], [plateauEnd, 1],
      [between(plateauEnd, repolEnd, .55), .6], [repolEnd, .08], [between(repolEnd, 1, .4), 0], [1, 0]]),
    // The inward rectifier can carry OUTWARD current above E_K. Rectification
    // suppresses it during the plateau; low driving force limits it near rest.
    curve('IK1', [[0, .06], [start, .06], [peak, .01], [plateauEnd, .01],
      [between(plateauEnd, repolEnd, .65), 1], [repolEnd, .06], [1, .06]]),
  )
  if (kind === 'purkinje') curves.unshift(curve('If', [[0, -.55], [start, -.55], [peak, 0],
    [between(plateauEnd, repolEnd, .8), 0], [repolEnd, -.1], [between(repolEnd, 1, .7), -1], [1, -.55]]))
  return curves
}

const phaseNames = { p0: 'Phase 0 · upstroke', p1: 'Phase 1 · early repolarization', p2: 'Phase 2 · plateau', repol: 'Phase 3 · repolarization', p3: 'Phase 3 · repolarization', p4: 'Phase 4', p4r: 'Phase 4', p4d: 'Phase 4' }
const phaseColors = { p0: '#fbbf24', p1: '#fb923c', p2: '#c084fc', repol: '#60a5fa', p3: '#60a5fa', p4: '#34d399', p4r: '#34d399', p4d: '#34d399' }

export function createCurrentExplorerCells(waves) {
  return [
    { id: 'sa', label: 'SA node', nodal: true,
      note: 'Follow pacemaker depolarization, the calcium-driven upstroke, and repolarization.' },
    { id: 'atrium', label: 'Atrial myocyte',
      note: 'An incoming impulse triggers this fast response AP. The short plateau includes overlapping inward and outward currents.' },
    { id: 'av', label: 'AV node', nodal: true,
      note: 'A simplified slow response nodal cell. In sinus rhythm, atrial input triggers the upstroke before latent automaticity would produce a beat; that intercellular current is not plotted.' },
    { id: 'purkinje', label: 'Purkinje fiber',
      note: 'A normally driven Purkinje fiber, not an independent pacemaker at the displayed rate. HCN current contributes to latent automaticity during phase 4.' },
    { id: 'ventricle', label: 'Ventricular myocyte',
      note: 'Purkinje input triggers this fast response AP. Follow overlapping calcium and potassium currents through the plateau and repolarization.' },
  ].map(cell => {
    let wave = waves[cell.id]
    const phases = wave.phases.filter(p => p.tRange[1] - p.tRange[0] > .00001)
      .map(p => ({ id: p.id, name: phaseNames[p.id], color: phaseColors[p.id], start: p.tRange[0], end: p.tRange[1] }))
      .sort((a, b) => a.start - b.start)
    const p0 = phases.find(p => p.id === 'p0')
    if (cell.id === 'purkinje') {
      // Carry the preceding cycle's small diastolic drift through the initial
      // pre-upstroke interval, avoiding a voltage jump on repeated playback.
      const drift = wave.data.at(-1)[1] - wave.data[0][1]
      wave = { ...wave, data: wave.data.map(([t, v]) => {
        const f = Math.max(0, Math.min(1, (t - p0.start) / (p0.end - p0.start)))
        return [t, v + drift * (1 - f * f * (3 - 2 * f))]
      }) }
    }
    const curves = cell.nodal
      ? buildSACurrentCurves(p0.start, p0.end).map(c => ({ ...c, direction: c.id === 'IK' ? 'outward' : 'inward' }))
      : buildFastCurrentCurves(cell.id, wave.phases)
    return { ...cell, wave, phases, curves: curves.map(c => ({ ...c,
      data: Array.from({ length: 1001 }, (_, i) => [i / 1000, sampleEnvelope(c.knots, i / 1000)]),
    })) }
  })
}
