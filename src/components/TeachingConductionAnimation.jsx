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
  const atrialProgress = ramp(fraction, 0.055, 0.18)
  const atrialDepolarized = ramp(fraction, 0.055, 0.17) * (1 - ramp(fraction, 0.48, 0.64))
  const atrialRecovery = bell(fraction, 0.48, 0.66)
  const avPulse = bell(fraction, 0.18, 0.34)
  const hisProgress = ramp(fraction, 0.34, 0.40)
  const purkinjeProgress = ramp(fraction, 0.40, 0.49)
  const ventricularProgress = ramp(fraction, 0.49, 0.66)
  const ventricularDepolarized = ramp(fraction, 0.49, 0.64) * (1 - ramp(fraction, 0.68, 0.90))
  const ventricularRecovery = bell(fraction, 0.66, 0.91)

  const atrialRadius = 18 + 132 * atrialProgress
  const leftAtrialRadius = Math.max(0, 92 * ramp(atrialProgress, 0.35, 1))
  const ventricularRadius = 8 + 115 * ventricularProgress

  const rvWall = 'M103 210 C71 236 66 304 105 354 C128 383 165 397 194 391 C174 356 162 322 164 280 C165 247 151 218 124 207 Z'
  const lvWall = 'M219 198 C190 225 184 268 191 315 C197 358 220 397 251 402 C289 385 314 336 312 278 C310 229 280 190 245 185 Z'
  const rightAtrium = 'M88 96 C58 111 51 161 72 198 C91 225 131 226 157 201 C169 180 163 130 141 103 C128 87 106 87 88 96 Z'
  const leftAtrium = 'M236 91 C207 102 195 136 204 171 C215 199 253 210 286 193 C310 178 313 136 294 108 C280 88 257 84 236 91 Z'

  return (
    <div className="relative w-[390px] max-w-full bg-[#080d18]">
      <svg viewBox="0 0 380 440" className="block h-auto w-full" role="img" aria-label="Schematic cardiac conduction animation">
        <defs>
          <filter id="teaching-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="teaching-atria-clip">
            <path d={rightAtrium} />
            <path d={leftAtrium} />
          </clipPath>
          <clipPath id="teaching-ventricle-clip">
            <path d={rvWall} />
            <path d={lvWall} />
          </clipPath>
        </defs>

        <rect width="380" height="440" fill="#080d18" />

        {/* Great vessels, deliberately simplified. */}
        <path d="M250 92 C242 52 258 29 284 25 C310 22 325 44 322 70" fill="none" stroke="#783f3b" strokeWidth="20" strokeLinecap="round" />
        <path d="M111 101 L111 47" fill="none" stroke="#6f4547" strokeWidth="15" strokeLinecap="round" />
        <path d="M110 196 L99 233" fill="none" stroke="#6f4547" strokeWidth="15" strokeLinecap="round" />

        {/* Resting myocardium. */}
        <path d={rightAtrium} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={leftAtrium} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={rvWall} fill="#4b292b" stroke="#a56661" strokeWidth="2" />
        <path d={lvWall} fill="#4b292b" stroke="#a56661" strokeWidth="2" />

        {/* Chamber cavities keep the drawing recognizably schematic. */}
        <path d="M105 226 C84 250 86 307 116 343 C128 358 145 366 160 365 C146 330 143 289 149 253 C145 234 128 221 105 226 Z" fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d="M239 211 C212 233 207 278 214 321 C220 353 233 374 249 382 C272 363 288 323 286 278 C284 238 264 207 239 211 Z" fill="#161923" stroke="#7d4a49" strokeWidth="1.5" />
        <path d="M181 190 C184 235 178 301 194 374" fill="none" stroke="#b26d66" strokeWidth="8" strokeLinecap="round" />

        {/* Atrial tissue stays warm behind an organic radial activation front. */}
        <g clipPath="url(#teaching-atria-clip)">
          <circle cx="121" cy="113" r={atrialRadius} fill="#e96b50" opacity={0.82 * atrialDepolarized} />
          <circle cx="230" cy="126" r={leftAtrialRadius} fill="#e96b50" opacity={0.82 * atrialDepolarized} />
          <circle cx="121" cy="113" r={atrialRadius} fill="none" stroke="#fde047" strokeWidth="7" opacity={atrialProgress < 1 ? 0.9 : 0} filter="url(#teaching-soft-glow)" />
          <circle cx="230" cy="126" r={leftAtrialRadius} fill="none" stroke="#fde047" strokeWidth="6" opacity={leftAtrialRadius > 0 && atrialProgress < 1 ? 0.8 : 0} />
          <circle cx="105" cy="160" r={38 + 90 * atrialRecovery} fill="none" stroke="#38bdf8" strokeWidth="26" opacity={0.52 * atrialRecovery} />
          <circle cx="258" cy="151" r={25 + 65 * atrialRecovery} fill="none" stroke="#38bdf8" strokeWidth="23" opacity={0.45 * atrialRecovery} />
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
        <TracedPath d="M132 110 C166 89 207 91 240 114" progress={ramp(atrialProgress, 0.18, 0.82)} opacity={1 - ramp(fraction, 0.18, 0.28)} />

        <circle cx="190" cy="158" r={6 + 4 * avPulse} fill={avPulse > 0 ? '#f59e0b' : '#8b5e34'} stroke="#ffd38a" strokeWidth="1.5" opacity={0.75 + 0.25 * avPulse} />
        <path d="M190 164 C191 179 194 190 197 204" fill="none" stroke="#596273" strokeWidth="4" strokeLinecap="round" />
        <TracedPath d="M190 164 C191 179 194 190 197 204" progress={hisProgress} width={5} opacity={1 - ramp(fraction, 0.40, 0.47)} />

        <path d="M197 204 C188 235 174 273 158 325 M197 204 C215 236 235 276 252 337" fill="none" stroke="#596273" strokeWidth="3.5" strokeLinecap="round" />
        <TracedPath d="M197 204 C188 235 174 273 158 325" progress={purkinjeProgress} width={5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
        <TracedPath d="M197 204 C215 236 235 276 252 337" progress={purkinjeProgress} width={5} opacity={1 - ramp(fraction, 0.49, 0.60)} />

        {/* Purkinje fans branch toward several endocardial activation sites. */}
        <g stroke="#596273" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M158 325 C137 316 120 298 108 278 M158 325 C140 339 130 352 123 365 M158 325 C175 337 183 349 188 365" />
          <path d="M252 337 C272 319 280 299 283 278 M252 337 C272 348 280 359 283 372 M252 337 C232 350 220 363 211 378" />
        </g>
        <g opacity={purkinjeProgress > 0 ? 1 : 0}>
          <TracedPath d="M158 325 C137 316 120 298 108 278 M158 325 C140 339 130 352 123 365 M158 325 C175 337 183 349 188 365" progress={purkinjeProgress} width={3.5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
          <TracedPath d="M252 337 C272 319 280 299 283 278 M252 337 C272 348 280 359 283 372 M252 337 C232 350 220 363 211 378" progress={purkinjeProgress} width={3.5} opacity={1 - ramp(fraction, 0.49, 0.60)} />
        </g>

        {/* Multiple curved fronts replace the former horizontal ventricular wipe. */}
        <g clipPath="url(#teaching-ventricle-clip)">
          <circle cx="123" cy="333" r={ventricularRadius} fill="#e96b50" opacity={0.84 * ventricularDepolarized} />
          <circle cx="211" cy="350" r={ventricularRadius * 0.95} fill="#e96b50" opacity={0.84 * ventricularDepolarized} />
          <circle cx="278" cy="309" r={ventricularRadius * 0.82} fill="#e96b50" opacity={0.84 * ventricularDepolarized} />
          <circle cx="181" cy="276" r={ventricularRadius * 0.72} fill="#e96b50" opacity={0.84 * ventricularDepolarized} />

          {[{ x: 123, y: 333, s: 1 }, { x: 211, y: 350, s: 0.95 }, { x: 278, y: 309, s: 0.82 }, { x: 181, y: 276, s: 0.72 }].map(origin => (
            <circle
              key={`${origin.x}-${origin.y}`}
              cx={origin.x}
              cy={origin.y}
              r={ventricularRadius * origin.s}
              fill="none"
              stroke="#fde047"
              strokeWidth="7"
              opacity={ventricularProgress > 0 && ventricularProgress < 1 ? 0.88 : 0}
              filter="url(#teaching-soft-glow)"
            />
          ))}

          {/* Soft, offset recovery patches intentionally avoid a single precise front. */}
          <circle cx="104" cy="245" r={25 + 105 * ventricularRecovery} fill="none" stroke="#38bdf8" strokeWidth="34" opacity={0.45 * ventricularRecovery} />
          <circle cx="292" cy="254" r={18 + 96 * ventricularRecovery} fill="none" stroke="#38bdf8" strokeWidth="30" opacity={0.40 * ventricularRecovery} />
          <circle cx="213" cy="378" r={15 + 105 * ventricularRecovery} fill="none" stroke="#2563eb" strokeWidth="28" opacity={0.35 * ventricularRecovery} />
        </g>

        {/* Labels are few and large enough to reinforce the pathway. */}
        <g fill="#e5e7eb" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
          <text x="16" y="20" fill="#cbd5e1">Patient’s right ←</text>
          <text x="268" y="58" fill="#cbd5e1">→ Patient’s left</text>
          <text x="77" y="82">SA node</text>
          <text x="101" y="178">RA</text>
          <text x="263" y="168">LA</text>
          <text x="153" y="151">AV node</text>
          <text x="205" y="195">His</text>
          <text x="91" y="392">RV</text>
          <text x="278" y="397">LV</text>
        </g>

        <g transform="translate(16 414)" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="600">
          <circle cx="5" cy="0" r="5" fill="#fde047" /><text x="15" y="4" fill="#e5e7eb">depolarizing front</text>
          <rect x="128" y="-5" width="10" height="10" rx="2" fill="#e96b50" /><text x="145" y="4" fill="#e5e7eb">depolarized</text>
          <circle cx="240" cy="0" r="5" fill="#38bdf8" /><text x="250" y="4" fill="#e5e7eb">repolarizing</text>
        </g>
      </svg>
      <div className="absolute right-2 top-2 rounded-md border border-gray-600 bg-gray-950/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
        Schematic · not to scale
      </div>
    </div>
  )
}
