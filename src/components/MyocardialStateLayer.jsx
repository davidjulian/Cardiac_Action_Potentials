import { useEffect, useMemo, useRef } from 'react'
import {
  ATRIAL_MYOCARDIUM, BACHMANN_BUNDLE, SA_NODE, AV_NODE, RIGHT_ATRIUM_CAVITY, LEFT_ATRIUM_CAVITY,
  RIGHT_VENTRICLE, LEFT_VENTRICLE, RIGHT_VENTRICLE_CAVITY, LEFT_VENTRICLE_CAVITY, SEPTUM,
} from '../lib/teachingHeartGeometry'

import { atrialArrival } from '../lib/atrialArrival'

const WIDTH = 380
const HEIGHT = 420
const SCALE = 2
const clamp = value => Math.max(0, Math.min(1, value))

function makeTissueMap() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const regions = [
    { id: 'rv', outer: RIGHT_VENTRICLE, inner: RIGHT_VENTRICLE_CAVITY, start: .50, end: .648, recovery: .68, recoveryEnd: .885 },
    { id: 'lv', outer: LEFT_VENTRICLE, inner: LEFT_VENTRICLE_CAVITY, start: .50, end: .645, recovery: .66, recoveryEnd: .90 },
    { id: 'septum', outer: SEPTUM, start: .49, end: .625, recovery: .715, recoveryEnd: .875 },
    { id: 'atria', outer: ATRIAL_MYOCARDIUM, start: .055, end: .21, recovery: .48, recoveryEnd: .66 },
  ].map(region => ({ ...region, wall: new Path2D(region.outer), cavity: region.inner ? new Path2D(region.inner) : null }))
  const gridWidth = WIDTH * SCALE
  const mask = new Uint8Array(gridWidth * HEIGHT * SCALE)
  const preferential = new Uint8Array(mask.length)
  const atrialWall = regions.at(-1).wall
  const cavities = [new Path2D(RIGHT_ATRIUM_CAVITY), new Path2D(LEFT_ATRIUM_CAVITY)]
  const band = new Path2D(BACHMANN_BUNDLE)
  let seed = 0, nearest = Infinity
  for (let i = 0; i < mask.length; i++) {
    const x = (i % gridWidth + .5) / SCALE
    const y = (Math.floor(i / gridWidth) + .5) / SCALE
    if (!(ctx.isPointInPath(atrialWall, x, y) || ctx.isPointInPath(band, x, y)) || cavities.some(c => ctx.isPointInPath(c, x, y))) continue
    mask[i] = 1
    preferential[i] = ctx.isPointInPath(band, x, y) ? 1 : 0
    const distance = Math.hypot(x - SA_NODE.x, y - SA_NODE.y)
    if (distance < nearest) { nearest = distance; seed = i }
  }
  const arrival = atrialArrival(mask, preferential, gridWidth, seed)
  const avArrival = arrival[Math.floor(AV_NODE.y * SCALE) * gridWidth + Math.floor(AV_NODE.x * SCALE)]
  let lastArrival = 0
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && !Number.isFinite(arrival[i])) throw new Error('Disconnected atrial myocardium')
    if (mask[i]) lastArrival = Math.max(lastArrival, arrival[i])
  }
  const points = regions.map(() => [])
  // Region order matches the visible SVG layering; the septum is myocardial
  // tissue too, so its entire drawn boundary participates in the same sequence.
  for (let py = 0; py < HEIGHT * SCALE; py++) {
    for (let px = 0; px < WIDTH * SCALE; px++) {
      const x = (px + .5) / SCALE
      const y = (py + .5) / SCALE
      for (let r = regions.length - 1; r >= 0; r--) {
        const region = regions[r]
        if (!ctx.isPointInPath(region.wall, x, y) && !(region.id === 'atria' && ctx.isPointInPath(band, x, y))) continue
        if (region.id === 'atria' && !mask[py * gridWidth + px]) break
        if (region.cavity && ctx.isPointInPath(region.cavity, x, y)) break
        let activation
        let recovery
        if (region.id === 'atria') {
          activation = arrival[py * gridWidth + px]
          recovery = activation
        } else {
          const apexX = region.id === 'rv' ? 168 : region.id === 'lv' ? 249 : 197
          const apexY = region.id === 'rv' ? 385 : region.id === 'lv' ? 400 : 370
          // Broad curved progression through the connected walls; early septal
          // activation is integrated, with no separate basal septal flash.
          activation = Math.hypot(.8 * (x - apexX), y - apexY)
          // A separate basal timing field makes recovery progress broadly
          // toward the apex, not along the activation path. Curved contours
          // and staggered chamber timing retain a schematic regional pattern.
          // This illustrates the base-before-apex LV pattern reported by
          // Sengupta et al. (2006), doi:10.1016/j.jacc.2005.08.073, in pigs;
          // it is not a measured or universal human recovery map.
          const baseX = region.id === 'rv' ? 125 : region.id === 'lv' ? 245 : 191
          recovery = Math.hypot(.65 * (x - baseX), y - 180)
        }
        points[r].push({ offset: (py * WIDTH * SCALE + px) * 4, activation, recovery })
        break
      }
    }
  }
  const pixels = []
  regions.forEach((region, r) => {
    let aMin = Infinity, aMax = -Infinity, rMin = Infinity, rMax = -Infinity
    for (const p of points[r]) {
      aMin = Math.min(aMin, p.activation); aMax = Math.max(aMax, p.activation)
      rMin = Math.min(rMin, p.recovery); rMax = Math.max(rMax, p.recovery)
    }
    for (const p of points[r]) {
      pixels.push({
        offset: p.offset,
        activation: region.id === 'atria'
          ? p.activation <= avArrival
            ? .055 + .113 * p.activation / avArrival
            : .168 + .03 * (p.activation - avArrival) / (lastArrival - avArrival)
          : region.start + (region.end - region.start - .012) * (p.activation - aMin) / (aMax - aMin),
        recovery: region.recovery + (region.recoveryEnd - region.recovery - .025) * (p.recovery - rMin) / (rMax - rMin),
        resting: region.id === 'lv' ? [91,48,50] : region.id === 'septum' ? [41,52,68] : [75,41,43],
      })
    }
  })
  return pixels
}

export default function MyocardialStateLayer({ fraction }) {
  const canvasRef = useRef(null)
  const pixels = useMemo(() => makeTissueMap(), [])
  const frameRef = useRef(null)
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    if (!frameRef.current) frameRef.current = ctx.createImageData(WIDTH * SCALE, HEIGHT * SCALE)
    const frame = frameRef.current
    for (const pixel of pixels) {
      let from = pixel.resting
      let to = from
      let amount = 0
      if (fraction >= pixel.recovery) {
        from = [56,189,248]
        to = pixel.resting
        amount = clamp((fraction - pixel.recovery) / .025)
      } else if (fraction >= pixel.activation) {
        from = [253,224,71]
        to = [233,107,80]
        amount = clamp((fraction - pixel.activation) / .012)
      }
      for (let channel = 0; channel < 3; channel++) {
        frame.data[pixel.offset + channel] = Math.round(from[channel] + amount * (to[channel] - from[channel]))
      }
      frame.data[pixel.offset + 3] = 255
    }
    ctx.putImageData(frame, 0, 0)
  }, [fraction, pixels])
  return (
    <foreignObject x="0" y="0" width={WIDTH} height={HEIGHT} pointerEvents="none" aria-hidden="true">
      <canvas ref={canvasRef} width={WIDTH * SCALE} height={HEIGHT * SCALE} style={{ width: WIDTH, height: HEIGHT, display: 'block' }} />
    </foreignObject>
  )
}
