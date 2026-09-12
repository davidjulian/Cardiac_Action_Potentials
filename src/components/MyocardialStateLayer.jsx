import { useEffect, useMemo, useRef } from 'react'
import {
  RIGHT_ATRIUM, LEFT_ATRIUM, RIGHT_ATRIUM_CAVITY, LEFT_ATRIUM_CAVITY,
  RIGHT_VENTRICLE, LEFT_VENTRICLE, RIGHT_VENTRICLE_CAVITY, LEFT_VENTRICLE_CAVITY, SEPTUM,
} from '../lib/teachingHeartGeometry'

const WIDTH = 380
const HEIGHT = 420
const SCALE = 2
const clamp = value => Math.max(0, Math.min(1, value))

// These centerlines reuse the successful atrial activation geometry. Every
// wall point receives an arrival time from the closest advancing pathway;
// recovery uses exactly the same spatial order after a chamber-specific delay.
const ATRIAL_ROUTES = {
  ra: [
    [[121,113], [96,119], [76,145], [79,174], [82,200], [105,216], [139,202]],
    [[121,113], [140,126], [157,143], [174,160], [181,169], [185,181], [188,194]],
    [[121,113], [118,141], [120,174], [137,202]],
  ],
  la: [
    [[240,114], [252,104], [282,111], [296,137], [310,163], [292,191], [260,199]],
    [[240,114], [211,140], [208,164], [219,184], [228,199], [247,204], [265,198]],
    [[240,114], [242,146], [248,174], [260,199]],
  ],
}

function sampleRoute(points) {
  const samples = []
  let distance = 0
  let previous = points[0]
  for (let segment = 0; segment < points.length - 1; segment += 3) {
    const [a, b, c, d] = points.slice(segment, segment + 4)
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const u = 1 - t
      const x = u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0]
      const y = u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1]
      distance += Math.hypot(x - previous[0], y - previous[1])
      samples.push({ x, y, distance })
      previous = [x, y]
    }
  }
  return samples
}

// Distance along a curved route plus distance into adjacent myocardium gives
// a continuous front, including wall corners outside the original wide strokes.
function atrialArrival(x, y, routes) {
  let arrival = Infinity
  for (const route of routes) {
    for (const point of route) {
      arrival = Math.min(arrival, point.distance + 1.6 * Math.hypot(x - point.x, y - point.y))
    }
  }
  return arrival
}

function makeTissueMap() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const regions = [
    { id: 'ra', outer: RIGHT_ATRIUM, inner: RIGHT_ATRIUM_CAVITY, start: .055, end: .18, recovery: .48, recoveryEnd: .625 },
    { id: 'la', outer: LEFT_ATRIUM, inner: LEFT_ATRIUM_CAVITY, start: .10, end: .21, recovery: .515, recoveryEnd: .66 },
    { id: 'rv', outer: RIGHT_VENTRICLE, inner: RIGHT_VENTRICLE_CAVITY, start: .50, end: .648, recovery: .68, recoveryEnd: .885 },
    { id: 'lv', outer: LEFT_VENTRICLE, inner: LEFT_VENTRICLE_CAVITY, start: .50, end: .645, recovery: .66, recoveryEnd: .875 },
    { id: 'septum', outer: SEPTUM, start: .49, end: .625, recovery: .715, recoveryEnd: .90 },
  ].map(region => ({ ...region, wall: new Path2D(region.outer), cavity: region.inner ? new Path2D(region.inner) : null }))
  const atrialRoutes = Object.fromEntries(Object.entries(ATRIAL_ROUTES).map(([key, routes]) => [key, routes.map(sampleRoute)]))
  const points = regions.map(() => [])
  // Region order matches the visible SVG layering; the septum is myocardial
  // tissue too, so its entire drawn boundary participates in the same sequence.
  for (let py = 0; py < HEIGHT * SCALE; py++) {
    for (let px = 0; px < WIDTH * SCALE; px++) {
      const x = (px + .5) / SCALE
      const y = (py + .5) / SCALE
      for (let r = regions.length - 1; r >= 0; r--) {
        const region = regions[r]
        if (!ctx.isPointInPath(region.wall, x, y)) continue
        if (region.cavity && ctx.isPointInPath(region.cavity, x, y)) break
        let activation
        let recovery
        if (atrialRoutes[region.id]) {
          activation = atrialArrival(x, y, atrialRoutes[region.id])
          recovery = activation
        } else {
          const apexX = region.id === 'rv' ? 168 : region.id === 'lv' ? 249 : 197
          const apexY = region.id === 'rv' ? 385 : region.id === 'lv' ? 400 : 370
          // Broad curved progression through the connected walls; early septal
          // activation is integrated, with no separate basal septal flash.
          activation = Math.hypot(.8 * (x - apexX), y - apexY)
          // Smooth regional timing variation illustrates recovery independently
          // of activation. It is not a universal apical-to-basal recovery map.
          recovery = .45 * activation + 36 * Math.sin((y - 190) / 70) + .32 * Math.abs(x - apexX)
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
        activation: region.start + (region.end - region.start - .012) * (p.activation - aMin) / (aMax - aMin),
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
