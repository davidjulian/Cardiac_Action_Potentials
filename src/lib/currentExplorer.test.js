import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFastCurrentCurves, createCurrentExplorerCells } from './currentExplorer.js'
import { sampleEnvelope } from './saCurrentExplorer.js'

const fastPhases = (plateauEnd = .37, repolEnd = .47) => [
  { id: 'p4r', tRange: [0, .08] }, { id: 'p0', tRange: [.08, .105] },
  { id: 'p1', tRange: [.105, .125] }, { id: 'p2', tRange: [.125, plateauEnd] },
  { id: 'p3', tRange: [plateauEnd, repolEnd] }, { id: 'p4d', tRange: [repolEnd, 1] },
]
const nodalWave = (start, peak) => ({ data: [[0, -60], [start, -40], [peak, 15], [1, -60]], phases: [
  { id: 'p4', tRange: [0, start] }, { id: 'p0', tRange: [start, peak] }, { id: 'repol', tRange: [peak, 1] },
] })
const waves = {
  sa: nodalWave(.66, .76), av: nodalWave(.844, .94),
  atrium: { data: [[0, -80], [1, -80]], phases: fastPhases(.25, .34) },
  ventricle: { data: [[0, -90], [1, -90]], phases: fastPhases() },
  purkinje: { data: [[0, -90], [.08, -90], [.105, 30], [.58, -90], [1, -86]], phases: fastPhases(.43, .58) },
}

test('all five cell types have finite periodic current envelopes with correct signs', () => {
  const cells = createCurrentExplorerCells(waves)
  assert.deepEqual(cells.map(c => c.id), ['sa', 'atrium', 'av', 'purkinje', 'ventricle'])
  for (const cell of cells) {
    assert.equal(cell.phases[0].start, 0)
    assert.equal(cell.phases.at(-1).end, 1)
    for (const curve of cell.curves) {
      assert.equal(sampleEnvelope(curve.knots, 0), sampleEnvelope(curve.knots, 1))
      for (let i = 1; i < curve.knots.length; i++) assert.ok(curve.knots[i][0] > curve.knots[i - 1][0])
      assert.equal(curve.data.length, 1001)
      for (const [, value] of curve.data) {
        assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
        assert.ok(curve.direction === 'inward' ? value <= 0 : value >= 0)
      }
    }
  }
})

test('cell-specific current sets and shared colors stay consistent', () => {
  const cells = createCurrentExplorerCells(waves)
  const byId = Object.fromEntries(cells.map(c => [c.id, c.curves.map(current => current.id)]))
  assert.deepEqual(byId.av, byId.sa)
  assert.ok(byId.atrium.includes('IKur') && !byId.ventricle.includes('IKur'))
  assert.ok(byId.purkinje.includes('If') && !byId.ventricle.includes('If'))
  assert.ok(!byId.sa.includes('INa') && byId.ventricle.includes('INa'))
  for (const id of ['If', 'ICaL']) {
    const colors = cells.flatMap(c => c.curves.filter(current => current.id === id).map(current => current.color))
    assert.equal(new Set(colors).size, 1)
  }
})

test('fast response sodium precedes calcium; rectifier current rises in late repolarization', () => {
  const curves = buildFastCurrentCurves('ventricle', fastPhases())
  const byId = Object.fromEntries(curves.map(c => [c.id, c]))
  const peak = c => c.knots.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b)[0]
  assert.ok(peak(byId.INa) > .08 && peak(byId.INa) < .105)
  assert.ok(peak(byId.ICaL) > peak(byId.INa))
  assert.ok(peak(byId.IK1) > .37 && peak(byId.IK1) < .47)
  assert.ok(sampleEnvelope(byId.IK1.knots, .25) < sampleEnvelope(byId.IK1.knots, 0))
})

test('Purkinje teaching voltage wraps continuously without changing the input wave', () => {
  const cell = createCurrentExplorerCells(waves).find(c => c.id === 'purkinje')
  assert.equal(cell.wave.data[0][1], cell.wave.data.at(-1)[1])
  assert.equal(cell.wave.data[2][1], 30)
  assert.equal(waves.purkinje.data[0][1], -90)
})
