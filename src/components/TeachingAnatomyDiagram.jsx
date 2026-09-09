const STRUCTURE_LABELS = {
  ra: 'Right atrium',
  la: 'Left atrium',
  sa: 'Sinoatrial node',
  av: 'Atrioventricular node',
  his: 'Bundle of His',
  rbundle: 'Right bundle branch',
  lbundle: 'Left bundle branch',
  purkinje: 'Purkinje fibers',
  rv: 'Right ventricle',
  lv: 'Left ventricle',
  septum: 'Interventricular septum',
}

const rightAtrium = 'M88 96 C58 111 51 161 72 198 C91 225 131 226 157 201 C169 180 163 130 141 103 C128 87 106 87 88 96 Z'
const leftAtrium = 'M236 91 C207 102 195 136 204 171 C215 199 253 210 286 193 C310 178 313 136 294 108 C280 88 257 84 236 91 Z'
const rightVentricle = 'M103 210 C71 236 66 304 105 354 C128 383 165 397 194 391 C174 356 162 322 164 280 C165 247 151 218 124 207 Z'
const leftVentricle = 'M219 198 C190 225 184 268 191 315 C197 358 220 397 251 402 C289 385 314 336 312 278 C310 229 280 190 245 185 Z'
const septum = 'M181 190 C184 235 178 301 194 374 C201 350 206 311 204 269 C203 231 198 205 191 188 Z'

export default function TeachingAnatomyDiagram({ active, onSelect, onHover }) {
  const interactive = key => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': STRUCTURE_LABELS[key],
    onMouseEnter: () => onHover(key),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(key),
    onBlur: () => onHover(null),
    onClick: () => onSelect(previous => previous === key ? null : key),
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect(previous => previous === key ? null : key)
      }
    },
    className: 'cursor-pointer outline-none focus-visible:[filter:drop-shadow(0_0_5px_#34d399)]',
  })

  const tissueStyle = (key, restingFill) => ({
    fill: active === key ? '#166534' : restingFill,
    stroke: active === key ? '#86efac' : '#b66f68',
    strokeWidth: active === key ? 4 : 2,
  })

  const pathwayStyle = key => ({
    stroke: active === key ? '#fde047' : '#aab4c3',
    strokeWidth: active === key ? 7 : 4,
    filter: active === key ? 'url(#anatomy-glow)' : 'none',
  })

  return (
    <div className="relative w-[390px] max-w-full overflow-hidden rounded-xl border border-gray-700 bg-[#080d18]">
      <svg
        viewBox="0 0 380 440"
        className="block h-auto w-full"
        role="img"
        aria-label="Interactive schematic of cardiac anatomy and the conduction system"
      >
        <defs>
          <filter id="anatomy-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="380" height="440" fill="#080d18" />

        <path d="M250 92 C242 52 258 29 284 25 C310 22 325 44 322 70" fill="none" stroke="#9b514b" strokeWidth="20" strokeLinecap="round" />
        <path d="M111 101 L111 47" fill="none" stroke="#8f585b" strokeWidth="15" strokeLinecap="round" />
        <path d="M110 196 L99 233" fill="none" stroke="#8f585b" strokeWidth="15" strokeLinecap="round" />

        <path d={rightAtrium} {...tissueStyle('ra', '#4b292b')} {...interactive('ra')} />
        <path d={leftAtrium} {...tissueStyle('la', '#4b292b')} {...interactive('la')} />
        <path d={rightVentricle} {...tissueStyle('rv', '#4b292b')} {...interactive('rv')} />
        <path d={leftVentricle} {...tissueStyle('lv', '#4b292b')} {...interactive('lv')} />

        <path d="M105 226 C84 250 86 307 116 343 C128 358 145 366 160 365 C146 330 143 289 149 253 C145 234 128 221 105 226 Z" fill="#161923" stroke="#96605d" strokeWidth="2" pointerEvents="none" />
        <path d="M239 211 C212 233 207 278 214 321 C220 353 233 374 249 382 C272 363 288 323 286 278 C284 238 264 207 239 211 Z" fill="#161923" stroke="#96605d" strokeWidth="2" pointerEvents="none" />

        <path d={septum} fill={active === 'septum' ? '#075985' : '#293444'} stroke={active === 'septum' ? '#7dd3fc' : '#8491a3'} strokeWidth={active === 'septum' ? 4 : 2} {...interactive('septum')} />

        <path d="M127 119 C145 130 168 140 188 153" fill="none" stroke="#aab4c3" strokeWidth="3" strokeDasharray="5 5" pointerEvents="none" />
        <path d="M132 110 C166 89 207 91 240 114" fill="none" stroke="#aab4c3" strokeWidth="3" strokeDasharray="5 5" pointerEvents="none" />

        <g {...interactive('sa')}>
          <circle cx="121" cy="113" r="15" fill="transparent" />
          <circle cx="121" cy="113" r="8" fill={active === 'sa' ? '#fde047' : '#b9973f'} stroke={active === 'sa' ? '#fff7ae' : '#f5d97a'} strokeWidth={active === 'sa' ? 4 : 2} filter={active === 'sa' ? 'url(#anatomy-glow)' : 'none'} />
        </g>

        <g {...interactive('av')}>
          <circle cx="190" cy="158" r="15" fill="transparent" />
          <circle cx="190" cy="158" r="8" fill={active === 'av' ? '#fde047' : '#ad7135'} stroke={active === 'av' ? '#fff7ae' : '#ffd38a'} strokeWidth={active === 'av' ? 4 : 2} filter={active === 'av' ? 'url(#anatomy-glow)' : 'none'} />
        </g>

        <g {...interactive('his')}>
          <path d="M190 164 C191 179 194 190 197 204" fill="none" strokeLinecap="round" {...pathwayStyle('his')} />
          <path d="M190 160 C191 179 194 194 199 208" fill="none" stroke="transparent" strokeWidth="18" />
        </g>

        <g {...interactive('rbundle')}>
          <path d="M197 204 C188 235 174 273 158 325" fill="none" strokeLinecap="round" {...pathwayStyle('rbundle')} />
          <path d="M197 204 C188 235 174 273 158 325" fill="none" stroke="transparent" strokeWidth="18" />
        </g>
        <g {...interactive('lbundle')}>
          <path d="M197 204 C215 236 235 276 252 337" fill="none" strokeLinecap="round" {...pathwayStyle('lbundle')} />
          <path d="M197 204 C215 236 235 276 252 337" fill="none" stroke="transparent" strokeWidth="18" />
        </g>

        <g {...interactive('purkinje')} fill="none" strokeLinecap="round">
          <path d="M158 325 C137 316 120 298 108 278 M158 325 C140 339 130 352 123 365 M158 325 C175 337 183 349 188 365" {...pathwayStyle('purkinje')} strokeWidth={active === 'purkinje' ? 5 : 3} />
          <path d="M252 337 C272 319 280 299 283 278 M252 337 C272 348 280 359 283 372 M252 337 C232 350 220 363 211 378" {...pathwayStyle('purkinje')} strokeWidth={active === 'purkinje' ? 5 : 3} />
          <path d="M158 325 C137 316 120 298 108 278 M158 325 C140 339 130 352 123 365 M158 325 C175 337 183 349 188 365 M252 337 C272 319 280 299 283 278 M252 337 C272 348 280 359 283 372 M252 337 C232 350 220 363 211 378" stroke="transparent" strokeWidth="18" />
        </g>

        <g fill="#f3f4f6" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="600" pointerEvents="none">
          <text x="16" y="20" fill="#cbd5e1">Patient's right ←</text>
          <text x="268" y="42" fill="#cbd5e1">→ Patient's left</text>
          <text x="74" y="82">SA node</text>
          <text x="95" y="178">RA</text>
          <text x="263" y="168">LA</text>
          <text x="149" y="151">AV node</text>
          <text x="205" y="195">His</text>
          <text x="91" y="392">RV</text>
          <text x="278" y="397">LV</text>
          <text x="156" y="273" transform="rotate(-82 156 273)">R bundle</text>
          <text x="229" y="267" transform="rotate(66 229 267)">L bundle</text>
          <text x="214" y="370">Purkinje</text>
          <text x="204" y="304" transform="rotate(86 204 304)">Septum</text>
        </g>
      </svg>
      <div className="absolute bottom-2 left-2 rounded-md border border-gray-600 bg-gray-950/90 px-2 py-1 text-xs font-semibold text-gray-200">
        Select a structure for details
      </div>
    </div>
  )
}
