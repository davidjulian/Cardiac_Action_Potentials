// Illustrative envelopes, not conductances, measured currents, or an ionic
// model that generates Vm. Heights are normalized independently per row.
// Key times express only qualitative overlap relative to the displayed AP.
const smooth = t => t * t * (3 - 2 * t)

export function sampleEnvelope(knots, fraction) {
  const t = Math.max(0, Math.min(1, fraction))
  for (let i = 1; i < knots.length; i++) {
    if (t <= knots[i][0]) {
      const [a, b] = [knots[i - 1], knots[i]]
      return a[1] + (b[1] - a[1]) * smooth((t - a[0]) / (b[0] - a[0]))
    }
  }
  return knots.at(-1)[1]
}

export function buildSACurrentCurves(p4 = .66, peak = .76) {
  const up = peak - p4
  const recovery = 1 - peak
  return [
    {
      id: 'If', subscript: 'f', label: 'I_f', channel: 'HCN channels',
      detail: 'Mixed Na⁺/K⁺ current', color: '#a78bfa',
      knots: [[0, -.48], [p4 * .25, -1], [p4 * .55, -.75], [p4 * .85, -.20],
        [p4 + up * .1, 0], [peak + recovery * .64, 0], [1, -.48]],
    },
    {
      id: 'ICaT', subscript: 'Ca,T', label: 'I_Ca,T', channel: 'T-type Ca²⁺ channels',
      detail: 'Transient calcium current', color: '#22d3ee',
      knots: [[0, 0], [p4 * .48, 0], [p4 * .83, -1], [p4, -.48],
        [p4 + up * .55, 0], [1, 0]],
    },
    {
      id: 'ICaL', subscript: 'Ca,L', label: 'I_Ca,L', channel: 'L-type Ca²⁺ channels',
      detail: 'L-type calcium current', color: '#fbbf24',
      knots: [[0, 0], [p4 * .79, 0], [p4, -.35], [p4 + up * .55, -1],
        [peak, -.5], [peak + recovery * .38, 0], [1, 0]],
    },
    {
      id: 'IK', subscript: 'K', label: 'I_K', channel: 'Delayed-rectifier K⁺ channels',
      detail: 'I_Kr and I_Ks grouped here', color: '#fb7185',
      knots: [[0, .30], [p4 * .35, .04], [p4 * .85, .04], [p4, .12],
        [peak, .70], [peak + recovery * .30, 1], [peak + recovery * .72, .65], [1, .30]],
    },
  ]
}

export function sampleVoltage(data, fraction) {
  const t = Math.max(0, Math.min(1, fraction))
  for (let i = 1; i < data.length; i++) {
    if (t <= data[i][0]) {
      const [a, b] = [data[i - 1], data[i]]
      return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])
    }
  }
  return data.at(-1)[1]
}
