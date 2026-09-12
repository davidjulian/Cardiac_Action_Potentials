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

// A broad warm trail marks myocardium that has depolarized, while a short
// bright segment marks the leading edge. Curved paths communicate general
// direction without implying a quantitatively mapped activation boundary.
function DirectionalActivationPath({ d, progress, trailWidth, opacity }) {
  const visibleProgress = clamp01(progress)
  return (
    <>
      <TracedPath
        d={d}
        progress={visibleProgress}
        color="#e96b50"
        width={trailWidth}
        opacity={opacity}
      />
      <MovingFrontPath
        d={d}
        progress={visibleProgress}
        color="#fde047"
        width={7}
        opacity={0.92}
      />
    </>
  )
}

function MovingFrontPath({ d, progress, color, width, opacity = 1, frontLength = 0.075 }) {
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
      strokeDasharray={`${frontLength} ${1 - frontLength}`}
      strokeDashoffset={1 - visibleProgress}
      opacity={visibleProgress > 0 && visibleProgress < 1 ? opacity : 0}
      filter="url(#teaching-soft-glow)"
    />
  )
}

export default function TeachingConductionAnimation({ timeMs, cycleMs }) {
  const rawFraction = cycleMs > 0 ? timeMs / cycleMs : 0
  const fraction = rawFraction - Math.floor(rawFraction)

  const saPulse = bell(fraction, 0, 0.075)
  const atrialProgress = ramp(fraction, 0.055, 0.18)
  const atrialRecoveryFade = 1 - ramp(fraction, 0.48, 0.66)
  const rightAtrialLateralProgress = ramp(fraction, 0.055, 0.17)
  const rightAtrialSeptalProgress = ramp(fraction, 0.06, 0.18)
  // The schematic pathway must reach the left atrium before the left atrial
  // fill begins. This changes only the drawn travel rate, not the established
  // timing of right and left atrial myocardial activation.
  const bachmannProgress = ramp(atrialProgress, 0.05, 0.35)
  const leftAtrialLateralProgress = ramp(fraction, 0.10, 0.195)
  const leftAtrialSeptalProgress = ramp(fraction, 0.105, 0.21)
  const rightAtrialRecoveryProgress = ramp(fraction, 0.48, 0.625)
  const leftAtrialRecoveryProgress = ramp(fraction, 0.515, 0.66)
  const avPulse = bell(fraction, 0.18, 0.34)
  const hisProgress = ramp(fraction, 0.34, 0.40)
  // Show the specialized pathway in anatomical sequence. The bundle branch
  // wave reaches the apical endpoints before the terminal Purkinje fans
  // illuminate, avoiding the misleading appearance that distal fibers
  // activate ahead of the wave traveling down the branches.
  const bundleBranchProgress = ramp(fraction, 0.40, 0.44)
  const purkinjeProgress = ramp(fraction, 0.44, 0.49)
  const septalProgress = ramp(fraction, 0.49, 0.545)
  const rightVentricleProgress = ramp(fraction, 0.50, 0.66)
  const leftVentricleProgress = ramp(fraction, 0.50, 0.645)
  const apicalSeptalProgress = ramp(fraction, 0.505, 0.655)
  const ventricularDepolarized = ramp(fraction, 0.49, 0.64) * (1 - ramp(fraction, 0.68, 0.90))
  const leftEpicardialRecoveryProgress = ramp(fraction, 0.66, 0.86)
  const rightEpicardialRecoveryProgress = ramp(fraction, 0.68, 0.88)
  const septalEndocardialRecoveryProgress = ramp(fraction, 0.73, 0.91)

  return (
    <div className="relative w-[390px] max-w-full bg-[#080d18]">
      <svg viewBox={HEART_VIEW_BOX} className="block h-auto w-full" role="img" aria-label="Schematic cardiac conduction animation">
        <defs>
          <filter id="teaching-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <mask id="teaching-atria-wall-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="380" height="420">
            <rect width="380" height="420" fill="black" />
            <path d={RIGHT_ATRIUM} fill="white" />
            <path d={LEFT_ATRIUM} fill="white" />
            <path d={RIGHT_ATRIUM_CAVITY} fill="black" />
            <path d={LEFT_ATRIUM_CAVITY} fill="black" />
          </mask>
          <mask id="teaching-ventricular-wall-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="380" height="420">
            <rect width="380" height="420" fill="black" />
            <path d={RIGHT_VENTRICLE} fill="white" />
            <path d={LEFT_VENTRICLE} fill="white" />
            <path d={RIGHT_VENTRICLE_CAVITY} fill="black" />
            <path d={LEFT_VENTRICLE_CAVITY} fill="black" />
          </mask>
        </defs>

        <rect width="380" height="535" fill="#080d18" />

        {/* Great vessels, deliberately simplified. */}
        <path d="M250 92 C242 52 258 29 284 25 C310 22 325 44 322 70" fill="none" stroke="#783f3b" strokeWidth="20" strokeLinecap="round" />
        <path d="M111 101 L111 47" fill="none" stroke="#6f4547" strokeWidth="15" strokeLinecap="round" />
        <path d="M110 196 L99 233" fill="none" stroke="#6f4547" strokeWidth="15" strokeLinecap="round" />

        {/* Resting myocardium. */}
        <path d={RIGHT_ATRIUM} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={LEFT_ATRIUM} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={RIGHT_VENTRICLE} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={LEFT_VENTRICLE} fill="#5b3032" stroke="#a56661" strokeWidth="2" />

        {/* All four chambers use a cutaway convention. The walls are
            intentionally exaggerated for visibility. */}
        <path d={RIGHT_ATRIUM_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={LEFT_ATRIUM_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={RIGHT_VENTRICLE_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={LEFT_VENTRICLE_CAVITY} fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d={SEPTUM} fill="#293444" stroke="#8491a3" strokeWidth="1.5" />

        {/* Atrial activation follows broad curved paths rather than circular
            waves. Right atrial myocardium activates from the SA node first;
            left atrial fronts begin only after Bachmann's bundle arrives. */}
        <g mask="url(#teaching-atria-wall-mask)">
          <path
            d={RIGHT_ATRIUM}
            fill="#e96b50"
            opacity={0.72 * ramp(fraction, 0.16, 0.18) * atrialRecoveryFade}
          />
          <path
            d={LEFT_ATRIUM}
            fill="#e96b50"
            opacity={0.72 * ramp(fraction, 0.195, 0.21) * atrialRecoveryFade}
          />
          <DirectionalActivationPath
            d="M121 113 C96 119 76 145 79 174 C82 200 105 216 139 202"
            progress={rightAtrialLateralProgress}
            trailWidth={50}
            opacity={0.78 * atrialRecoveryFade}
          />
          <DirectionalActivationPath
            d="M121 113 C140 126 157 143 174 160 C181 169 185 181 188 194"
            progress={rightAtrialSeptalProgress}
            trailWidth={42}
            opacity={0.76 * atrialRecoveryFade}
          />
          <DirectionalActivationPath
            d="M121 113 C118 141 120 174 137 202"
            progress={rightAtrialLateralProgress}
            trailWidth={48}
            opacity={0.76 * atrialRecoveryFade}
          />
          <DirectionalActivationPath
            d="M230 126 C252 104 282 111 296 137 C310 163 292 191 260 199"
            progress={leftAtrialLateralProgress}
            trailWidth={50}
            opacity={0.78 * atrialRecoveryFade}
          />
          <DirectionalActivationPath
            d="M230 126 C211 140 208 164 219 184 C228 199 247 204 265 198"
            progress={leftAtrialSeptalProgress}
            trailWidth={42}
            opacity={0.76 * atrialRecoveryFade}
          />
          <DirectionalActivationPath
            d="M230 126 C242 146 248 174 260 199"
            progress={leftAtrialLateralProgress}
            trailWidth={48}
            opacity={0.76 * atrialRecoveryFade}
          />

          {/* Recovery is staggered across the atria. The cyan bands mark a
              moving recovery region; they do not imply a measured front. */}
          <MovingFrontPath
            d="M112 119 C91 139 86 172 101 198 C112 213 132 215 151 202"
            progress={rightAtrialRecoveryProgress}
            color="#38bdf8"
            width={24}
            opacity={0.62}
            frontLength={0.18}
          />
          <MovingFrontPath
            d="M235 126 C260 112 288 128 294 154 C298 179 278 198 248 199"
            progress={leftAtrialRecoveryProgress}
            color="#38bdf8"
            width={24}
            opacity={0.58}
            frontLength={0.18}
          />
        </g>

        {/* Nodes and named conduction pathways. */}
        <circle
          cx="121"
          cy="113"
          r={7 + 5 * saPulse}
          fill={saPulse > 0 ? '#fde047' : '#7c6941'}
          stroke={saPulse > 0 ? '#fff7ae' : '#a78b52'}
          strokeWidth="2"
          filter={saPulse > 0 ? 'url(#teaching-soft-glow)' : 'none'}
        />
        <path d="M127 119 C145 130 168 140 188 153" fill="none" stroke="#596273" strokeWidth="3" strokeDasharray="4 4" />
        <path d="M132 110 C166 89 207 91 240 114" fill="none" stroke="#596273" strokeWidth="3" strokeDasharray="4 4" />
        <TracedPath d="M127 119 C145 130 168 140 188 153" progress={atrialProgress} opacity={1 - ramp(fraction, 0.18, 0.28)} />
        <TracedPath d="M132 110 C166 89 207 91 240 114" progress={bachmannProgress} opacity={1 - ramp(fraction, 0.18, 0.28)} />

        <circle cx="190" cy="158" r={6 + 4 * avPulse} fill={avPulse > 0 ? '#f59e0b' : '#8b5e34'} stroke="#ffd38a" strokeWidth="1.5" opacity={0.75 + 0.25 * avPulse} />
        <path d="M190 164 C191 179 194 190 197 204" fill="none" stroke="#596273" strokeWidth="4" strokeLinecap="round" />
        <TracedPath d="M190 164 C191 179 194 190 197 204" progress={hisProgress} width={5} opacity={1 - ramp(fraction, 0.40, 0.47)} />

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

        {/* Directional ventricular activation. The small septal front begins
            nearly with the apical endocardial fronts. Broad curved trails
            then spread through the walls and generally upward toward the
            base. This preserves the important sequence without presenting
            four simultaneous, isotropically expanding point sources. */}
        <g mask="url(#teaching-ventricular-wall-mask)">
          <DirectionalActivationPath
            d="M207 237 C195 235 183 238 169 247"
            progress={septalProgress}
            trailWidth={28}
            opacity={0.78 * ventricularDepolarized}
          />
          <DirectionalActivationPath
            d="M123 365 C103 344 91 309 96 274 C99 245 111 220 132 203"
            progress={rightVentricleProgress}
            trailWidth={58}
            opacity={0.78 * ventricularDepolarized}
          />
          <DirectionalActivationPath
            d="M211 378 C243 369 271 347 286 314 C300 281 293 237 260 198"
            progress={leftVentricleProgress}
            trailWidth={66}
            opacity={0.82 * ventricularDepolarized}
          />
          <DirectionalActivationPath
            d="M188 368 C177 337 175 302 181 270 C185 245 192 221 204 201"
            progress={apicalSeptalProgress}
            trailWidth={34}
            opacity={0.76 * ventricularDepolarized}
          />

          {/* Ventricular recovery begins in apical and epicardial regions and
              proceeds generally toward basal and endocardial regions. The
              staggered bands emphasize that it is not simply depolarization
              played backward. */}
          <MovingFrontPath
            d="M274 350 C294 318 298 278 284 244 C275 221 258 204 238 194"
            progress={leftEpicardialRecoveryProgress}
            color="#38bdf8"
            width={30}
            opacity={0.62}
            frontLength={0.16}
          />
          <MovingFrontPath
            d="M111 350 C88 320 78 285 87 252 C94 228 107 211 126 199"
            progress={rightEpicardialRecoveryProgress}
            color="#38bdf8"
            width={28}
            opacity={0.58}
            frontLength={0.16}
          />
          <MovingFrontPath
            d="M203 370 C193 337 187 302 190 268 C192 238 197 216 205 198"
            progress={septalEndocardialRecoveryProgress}
            color="#2563eb"
            width={24}
            opacity={0.52}
            frontLength={0.17}
          />
        </g>

        {/* Labels are few and large enough to reinforce the pathway. */}
        <g fill="#e5e7eb" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
          <text x="16" y="20" fill="#cbd5e1">Patient’s right ←</text>
          <text x="268" y="58" fill="#cbd5e1">→ Patient’s left</text>
          <text x="77" y="82">SA node</text>
          <text x="108" y="164">RA</text>
          <text x="255" y="158">LA</text>
          <text x="153" y="151">AV node</text>
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
  RIGHT_ATRIUM,
  LEFT_ATRIUM,
  RIGHT_ATRIUM_CAVITY,
  LEFT_ATRIUM_CAVITY,
  RIGHT_VENTRICLE,
  LEFT_VENTRICLE,
  RIGHT_VENTRICLE_CAVITY,
  LEFT_VENTRICLE_CAVITY,
  SEPTUM,
} from '../lib/teachingHeartGeometry'
import TransverseVentricularInset from './TransverseVentricularInset'
