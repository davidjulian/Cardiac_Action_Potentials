import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSACurrentCurves, sampleEnvelope, sampleVoltage } from './saCurrentExplorer.js'

test('schematic currents are finite, bounded, signed, and continuous at cycle wrap', () => {
  const curves = buildSACurrentCurves()
  assert.deepEqual(curves.map(c => c.id), ['If', 'ICaT', 'ICaL', 'IK'])
  for (const curve of curves) {
    assert.equal(curve.knots[0][0], 0)
    assert.equal(curve.knots.at(-1)[0], 1)
    assert.equal(sampleEnvelope(curve.knots, 0), sampleEnvelope(curve.knots, 1))
    for (let i = 1; i < curve.knots.length; i++) {
      assert.ok(curve.knots[i][0] > curve.knots[i - 1][0])
    }
    for (let i = 0; i <= 1000; i++) {
      const value = sampleEnvelope(curve.knots, i / 1000)
      assert.ok(Number.isFinite(value))
      assert.ok(Math.abs(value) <= 1)
      assert.ok(curve.id === 'IK' ? value >= 0 : value <= 0)
    }
  }
})

test('illustrative peaks follow the intended phase sequence', () => {
  const curves = buildSACurrentCurves()
  const peakTimes = curves.map(curve => curve.knots.reduce((peak, knot) =>
    Math.abs(knot[1]) > Math.abs(peak[1]) ? knot : peak)[0])
  assert.ok(peakTimes[0] < peakTimes[1])
  assert.ok(peakTimes[1] < .66)
  assert.ok(peakTimes[2] > .66 && peakTimes[2] < .76)
  assert.ok(peakTimes[3] > .76)
  assert.ok(sampleEnvelope(curves[3].knots, 0) > sampleEnvelope(curves[3].knots, .4))
})

test('sampling clamps endpoints and interpolates voltage', () => {
  const data = [[0, -60], [.5, 10], [1, -60]]
  assert.equal(sampleVoltage(data, -.1), -60)
  assert.equal(sampleVoltage(data, 1.1), -60)
  assert.equal(sampleVoltage(data, .25), -25)
  const knots = buildSACurrentCurves()[0].knots
  assert.equal(sampleEnvelope(knots, -.1), knots[0][1])
  assert.equal(sampleEnvelope(knots, 1.1), knots.at(-1)[1])
})
