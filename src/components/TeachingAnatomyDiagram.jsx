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
        viewBox={HEART_VIEW_BOX}
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

        <rect width="380" height="535" fill="#080d18" />

        <path d="M250 92 C242 52 258 29 284 25 C310 22 325 44 322 70" fill="none" stroke="#9b514b" strokeWidth="20" strokeLinecap="round" />
        <path d="M111 101 L111 47" fill="none" stroke="#8f585b" strokeWidth="15" strokeLinecap="round" />
        <path d="M110 196 L99 233" fill="none" stroke="#8f585b" strokeWidth="15" strokeLinecap="round" />

        <path d={RIGHT_ATRIUM} {...tissueStyle('ra', '#4b292b')} {...interactive('ra')} />
        <path d={LEFT_ATRIUM} {...tissueStyle('la', '#4b292b')} {...interactive('la')} />
        <path d={RIGHT_VENTRICLE} {...tissueStyle('rv', '#4b292b')} {...interactive('rv')} />
        <path d={LEFT_VENTRICLE} {...tissueStyle('lv', '#5b3032')} {...interactive('lv')} />

        {/* All chambers use the same cutaway convention. Wall thickness is
            exaggerated so structures and wavefronts remain legible. */}
        <path d={RIGHT_ATRIUM_CAVITY} fill="#161923" stroke="#96605d" strokeWidth="2" pointerEvents="none" />
        <path d={LEFT_ATRIUM_CAVITY} fill="#161923" stroke="#96605d" strokeWidth="2" pointerEvents="none" />
        <path d={RIGHT_VENTRICLE_CAVITY} fill="#161923" stroke="#96605d" strokeWidth="2" pointerEvents="none" />
        <path d={LEFT_VENTRICLE_CAVITY} fill="#161923" stroke="#96605d" strokeWidth="2" pointerEvents="none" />

        <path d={SEPTUM} fill={active === 'septum' ? '#075985' : '#293444'} stroke={active === 'septum' ? '#7dd3fc' : '#8491a3'} strokeWidth={active === 'septum' ? 4 : 2} {...interactive('septum')} />

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
          <text x="108" y="164">RA</text>
          <text x="255" y="158">LA</text>
          <text x="149" y="151">AV node</text>
          <text x="205" y="195">His</text>
          <text x="105" y="384">RV</text>
          <text x="281" y="402">LV</text>
          <text x="156" y="273" transform="rotate(-82 156 273)">R bundle</text>
          <text x="229" y="267" transform="rotate(66 229 267)">L bundle</text>
          <text x="214" y="370">Purkinje</text>
          <text x="178" y="300" transform="rotate(80 178 300)">Septum</text>
        </g>

        {/* Orientation landmarks remain visible without selecting a structure. */}
        <g fill="#f3f4f6" stroke="#cbd5e1" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700" pointerEvents="none">
          <text x="12" y="239" stroke="none">Ventricular</text>
          <text x="12" y="255" stroke="none">base</text>
          <path d="M85 234 L109 215" fill="none" strokeWidth="1.5" />
          <circle cx="109" cy="215" r="2.5" stroke="none" />
          <text x="296" y="423" stroke="none">Apex</text>
          <path d="M287 418 L252 410" fill="none" strokeWidth="1.5" />
          <circle cx="252" cy="410" r="2.5" stroke="none" />
        </g>

        <TransverseVentricularInset active={active} prefix="Anatomy diagram" />
      </svg>
      <div className="absolute right-2 top-2 rounded-md border border-gray-600 bg-gray-950/90 px-2 py-1 text-xs font-semibold text-gray-200">
        Select a structure for details
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
