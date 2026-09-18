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


        {/* Resting myocardium. */}
        <path d={RIGHT_VENTRICLE} fill="#543940" stroke="#b99299" strokeWidth="2" />
        <path d={LEFT_VENTRICLE} fill="#543940" stroke="#b99299" strokeWidth="2" />

        <path d={ATRIAL_MYOCARDIUM} fill="#543940" stroke="#b99299" strokeWidth="2" />
        <path d={BACHMANN_BUNDLE} fill="#543940" />

        {/* All four chambers use a cutaway convention. The walls are
            intentionally exaggerated for visibility. */}
        <path d={RIGHT_ATRIUM_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="1.5" />
        <path d={LEFT_ATRIUM_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="1.5" />
        <path d={RIGHT_VENTRICLE_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="1.5" />
        <path d={LEFT_VENTRICLE_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="1.5" />
        <path d={SEPTUM} fill="#543940" stroke="#a67b84" strokeWidth="1.5" />

        <MyocardialStateLayer fraction={fraction} />
        <path d={AV_BOUNDARY} fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />

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

        <path d={RIGHT_BUNDLE + ' ' + LEFT_BUNDLE} fill="none" stroke="#596273" strokeWidth="3.5" strokeLinecap="round" />
        <TracedPath d={RIGHT_BUNDLE} progress={bundleBranchProgress} width={5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
        <TracedPath d={LEFT_BUNDLE} progress={bundleBranchProgress} width={5} opacity={1 - ramp(fraction, 0.49, 0.60)} />

        {/* Purkinje fans branch toward several endocardial activation sites. */}
        <g stroke="#596273" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d={RIGHT_PURKINJE} />
          <path d={LEFT_PURKINJE} />
        </g>
        <g opacity={purkinjeProgress > 0 ? 1 : 0}>
          <TracedPath d={RIGHT_PURKINJE} progress={purkinjeProgress} width={3.5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
          <TracedPath d={LEFT_PURKINJE} progress={purkinjeProgress} width={3.5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
        </g>

        {/* Labels are few and large enough to reinforce the pathway. */}
        <TeachingHeartLabels />

        <g transform="translate(16 422)" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="600">
          <circle cx="5" cy="0" r="5" fill="#fde047" /><text x="15" y="4" fill="#e5e7eb">depolarizing front</text>
          <rect x="128" y="-5" width="10" height="10" rx="2" fill="#e96b50" /><text x="145" y="4" fill="#e5e7eb">depolarized</text>
          <circle cx="240" cy="0" r="5" fill="#38bdf8" /><text x="250" y="4" fill="#e5e7eb">repolarizing</text>
        </g>

        <TransverseVentricularInset prefix="Conduction animation" />
      </svg>

    </div>
  )
}
import {
  HEART_VIEW_BOX, RIGHT_BUNDLE, LEFT_BUNDLE, RIGHT_PURKINJE, LEFT_PURKINJE,
  ATRIAL_MYOCARDIUM, BACHMANN_BUNDLE, AV_BOUNDARY, SA_NODE, AV_NODE, HIS_PATH,
  RIGHT_ATRIUM_CAVITY,
  LEFT_ATRIUM_CAVITY,
  RIGHT_VENTRICLE,
  LEFT_VENTRICLE,
  RIGHT_VENTRICLE_CAVITY,
  LEFT_VENTRICLE_CAVITY,
  SEPTUM,
} from '../lib/teachingHeartGeometry'
import TeachingHeartLabels from './TeachingHeartLabels'
import TransverseVentricularInset from './TransverseVentricularInset'
import MyocardialStateLayer from './MyocardialStateLayer'
