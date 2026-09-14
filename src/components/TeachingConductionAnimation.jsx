function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

function ramp(value, start, end) {
  return clamp01((value - start) / (end - start))
}

function windowProgress(value, start, end) {
  if (value < start || value >= end) return 0
  return (value - start) / (end - start)
}

function bell(value, start, end) {
  const progress = windowProgress(value, start, end)
  return progress === 0 ? 0 : Math.sin(Math.PI * progress)
}

function TracedPath({ d, progress, color = '#fde047', width = 4, opacity = 1 }) {
  const visibleProgress = clamp01(progress)
  return (
    <path
      d={d}
      pathLength="1"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1"
      strokeDashoffset={1 - visibleProgress}
      opacity={visibleProgress > 0 ? opacity : 0}
    />
  )
}

export default function TeachingConductionAnimation({ timeMs, cycleMs }) {
  const rawFraction = cycleMs > 0 ? timeMs / cycleMs : 0
  const fraction = rawFraction - Math.floor(rawFraction)

  const saPulse = bell(fraction, 0, 0.075)
  const avPulse = bell(fraction, 0.18, 0.34)
  const hisProgress = ramp(fraction, 0.34, 0.40)
  // Show the specialized pathway in anatomical sequence. The bundle branch
  // wave reaches the apical endpoints before the terminal Purkinje fans
  // illuminate, avoiding the misleading appearance that distal fibers
  // activate ahead of the wave traveling down the branches.
  const bundleBranchProgress = ramp(fraction, 0.40, 0.44)
  const purkinjeProgress = ramp(fraction, 0.44, 0.49)

  return (
    <div className="relative w-[390px] max-w-full bg-[#080d18]">
      <svg viewBox={HEART_VIEW_BOX} className="block h-auto w-full" role="img" aria-label="Schematic cardiac conduction animation">
        <defs>
          <filter id="teaching-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="380" height="535" fill="#080d18" />

        {/* Great vessels, deliberately simplified. */}
        <path d="M250 92 C242 52 258 29 284 25 C310 22 325 44 322 70" fill="none" stroke="#783f3b" strokeWidth="20" strokeLinecap="round" />
        <path d="M111 101 L111 47" fill="none" stroke="#6f4547" strokeWidth="15" strokeLinecap="round" />
        <path d="M110 196 L99 233" fill="none" stroke="#6f4547" strokeWidth="15" strokeLinecap="round" />

        {/* Resting myocardium. */}
        <path d={RIGHT_VENTRICLE} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={LEFT_VENTRICLE} fill="#5b3032" stroke="#a56661" strokeWidth="2" />

        <path d={ATRIAL_MYOCARDIUM} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={BACHMANN_BUNDLE} fill="#4b292b" stroke="#a56661" strokeWidth="2" />

        {/* All four chambers use a cutaway convention. The walls are
            intentionally exaggerated for visibility. */}
        <path d={RIGHT_ATRIUM_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={LEFT_ATRIUM_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={RIGHT_VENTRICLE_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={LEFT_VENTRICLE_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={SEPTUM} fill="#293444" stroke="#8491a3" strokeWidth="1.5" />

        <MyocardialStateLayer fraction={fraction} />
        <path d={AV_BOUNDARY} fill="none" stroke="#cbd5e1" strokeWidth="7" />

        {/* Nodes and named conduction pathways. */}
        <circle
          cx={SA_NODE.x}
          cy={SA_NODE.y}
          r={7 + 5 * saPulse}
          fill={saPulse > 0 ? '#fde047' : '#7c6941'}
          stroke={saPulse > 0 ? '#fff7ae' : '#a78b52'}
          strokeWidth="2"
          filter={saPulse > 0 ? 'url(#teaching-soft-glow)' : 'none'}
        />
        <circle cx={AV_NODE.x} cy={AV_NODE.y} r={6 + 4 * avPulse} fill={avPulse > 0 ? '#f59e0b' : '#8b5e34'} stroke="#ffd38a" strokeWidth="1.5" opacity={0.75 + 0.25 * avPulse} />
        <path d={HIS_PATH} fill="none" stroke="#596273" strokeWidth="4" strokeLinecap="round" />
        <TracedPath d={HIS_PATH} progress={hisProgress} width={5} opacity={1 - ramp(fraction, 0.40, 0.47)} />

        <path d="M197 204 C188 235 174 273 158 325 M197 204 C215 236 235 276 252 337" fill="none" stroke="#596273" strokeWidth="3.5" strokeLinecap="round" />
        <TracedPath d="M197 204 C188 235 174 273 158 325" progress={bundleBranchProgress} width={5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
        <TracedPath d="M197 204 C215 236 235 276 252 337" progress={bundleBranchProgress} width={5} opacity={1 - ramp(fraction, 0.49, 0.60)} />

        {/* Purkinje fans branch toward several endocardial activation sites. */}
        <g stroke="#596273" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M158 325 C137 316 120 298 108 278 M158 325 C140 339 130 352 123 365 M158 325 C175 337 183 349 188 365" />
          <path d="M252 337 C272 319 280 299 283 278 M252 337 C272 348 280 359 283 372 M252 337 C232 350 220 363 211 378" />
        </g>
        <g opacity={purkinjeProgress > 0 ? 1 : 0}>
          <TracedPath d="M158 325 C137 316 120 298 108 278 M158 325 C140 339 130 352 123 365 M158 325 C175 337 183 349 188 365" progress={purkinjeProgress} width={3.5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
          <TracedPath d="M252 337 C272 319 280 299 283 278 M252 337 C272 348 280 359 283 372 M252 337 C232 350 220 363 211 378" progress={purkinjeProgress} width={3.5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
        </g>

        {/* Labels are few and large enough to reinforce the pathway. */}
        <g fill="#e5e7eb" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
          <text x="16" y="20" fill="#cbd5e1">Patient’s right ←</text>
          <text x="268" y="58" fill="#cbd5e1">→ Patient’s left</text>
          <text x="77" y="82">SA node</text>
          <text x="108" y="164">RA</text>
          <text x="255" y="158">LA</text>
          <text x="151" y="148">AV node</text>
          <text x="205" y="195">His</text>
          <text x="105" y="384">RV</text>
          <text x="281" y="402">LV</text>
        </g>

        <g transform="translate(16 422)" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="600">
          <circle cx="5" cy="0" r="5" fill="#fde047" /><text x="15" y="4" fill="#e5e7eb">depolarizing front</text>
          <rect x="128" y="-5" width="10" height="10" rx="2" fill="#e96b50" /><text x="145" y="4" fill="#e5e7eb">depolarized</text>
          <circle cx="240" cy="0" r="5" fill="#38bdf8" /><text x="250" y="4" fill="#e5e7eb">repolarizing</text>
        </g>

        <TransverseVentricularInset prefix="Conduction animation" />
      </svg>
      <div className="absolute right-2 top-2 rounded-md border border-gray-600 bg-gray-950/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
        Schematic · not to scale
      </div>
    </div>
  )
}
import {
  HEART_VIEW_BOX,
  ATRIAL_MYOCARDIUM, BACHMANN_BUNDLE, AV_BOUNDARY, SA_NODE, AV_NODE, HIS_PATH,
  RIGHT_ATRIUM_CAVITY,
  LEFT_ATRIUM_CAVITY,
  RIGHT_VENTRICLE,
  LEFT_VENTRICLE,
  RIGHT_VENTRICLE_CAVITY,
  LEFT_VENTRICLE_CAVITY,
  SEPTUM,
} from '../lib/teachingHeartGeometry'
import TransverseVentricularInset from './TransverseVentricularInset'
import MyocardialStateLayer from './MyocardialStateLayer'
