const STRUCTURE_LABELS = {
  bachmann: "Bachmann’s bundle",
  atrialSeptum: 'Atrial septal region',
  avInsulation: 'Atrioventricular insulation',
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
  base: 'Ventricular base',
  apex: 'Apex',
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
    stroke: active === key ? '#86efac' : '#b99299',
    strokeWidth: active === key ? 4 : 2,
  })

  const pathwayStyle = key => ({
    stroke: active === key ? '#fde047' : '#aab4c3',
    strokeWidth: active === key ? 5 : 3,
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


        <path d={RIGHT_VENTRICLE} {...tissueStyle('rv', '#543940')} {...interactive('rv')} />
        <path d={LEFT_VENTRICLE} {...tissueStyle('lv', '#543940')} {...interactive('lv')} />
        <path d={ATRIAL_MYOCARDIUM} fill="#543940" stroke="#b99299" strokeWidth="2" />
        <path d={RIGHT_ATRIUM} fill={active === 'ra' ? '#166534' : 'transparent'} {...interactive('ra')} />
        <path d={LEFT_ATRIUM} fill={active === 'la' ? '#166534' : 'transparent'} {...interactive('la')} />
        <path d={ATRIAL_SEPTUM} fill={active === 'atrialSeptum' ? '#166534' : 'transparent'} {...interactive('atrialSeptum')} />
        <path d={BACHMANN_BUNDLE} {...tissueStyle('bachmann', '#86626b')} {...interactive('bachmann')} />

        {/* All chambers use the same cutaway convention. Wall thickness is
            exaggerated so structures and wavefronts remain legible. */}
        <path d={RIGHT_ATRIUM_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="2" pointerEvents="none" />
        <path d={LEFT_ATRIUM_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="2" pointerEvents="none" />
        <path d={RIGHT_VENTRICLE_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="2" pointerEvents="none" />
        <path d={LEFT_VENTRICLE_CAVITY} fill="#101b2b" stroke="#a67b84" strokeWidth="2" pointerEvents="none" />

        <path d={SEPTUM} fill={active === 'septum' ? '#075985' : '#543940'} stroke={active === 'septum' ? '#7dd3fc' : '#a67b84'} strokeWidth={active === 'septum' ? 4 : 2} {...interactive('septum')} />

        <path d={AV_BOUNDARY} fill="none" stroke={active === 'avInsulation' ? '#86efac' : '#cbd5e1'} strokeWidth="4" strokeLinecap="round" {...interactive('avInsulation')} />

        <g {...interactive('sa')}>
          <circle cx={SA_NODE.x} cy={SA_NODE.y} r="15" fill="transparent" />
          <circle cx={SA_NODE.x} cy={SA_NODE.y} r="8" fill={active === 'sa' ? '#fde047' : '#b9973f'} stroke={active === 'sa' ? '#fff7ae' : '#f5d97a'} strokeWidth={active === 'sa' ? 4 : 2} filter={active === 'sa' ? 'url(#anatomy-glow)' : 'none'} />
        </g>

        <g {...interactive('av')}>
          <circle cx={AV_NODE.x} cy={AV_NODE.y} r="15" fill="transparent" />
          <circle cx={AV_NODE.x} cy={AV_NODE.y} r="8" fill={active === 'av' ? '#fde047' : '#ad7135'} stroke={active === 'av' ? '#fff7ae' : '#ffd38a'} strokeWidth={active === 'av' ? 4 : 2} filter={active === 'av' ? 'url(#anatomy-glow)' : 'none'} />
        </g>

        <g {...interactive('his')}>
          <path d={HIS_PATH} fill="none" strokeLinecap="round" {...pathwayStyle('his')} />
          <path d={HIS_PATH} fill="none" stroke="transparent" strokeWidth="18" />
        </g>

        <g {...interactive('rbundle')}>
          <path d={RIGHT_BUNDLE} fill="none" strokeLinecap="round" {...pathwayStyle('rbundle')} />
          <path d={RIGHT_BUNDLE} fill="none" stroke="transparent" strokeWidth="18" />
        </g>
        <g {...interactive('lbundle')}>
          <path d={LEFT_BUNDLE} fill="none" strokeLinecap="round" {...pathwayStyle('lbundle')} />
          <path d={LEFT_BUNDLE} fill="none" stroke="transparent" strokeWidth="18" />
        </g>

        <g {...interactive('purkinje')} fill="none" strokeLinecap="round">
          <path d={RIGHT_PURKINJE} {...pathwayStyle('purkinje')} strokeWidth={active === 'purkinje' ? 5 : 3} />
          <path d={LEFT_PURKINJE} {...pathwayStyle('purkinje')} strokeWidth={active === 'purkinje' ? 5 : 3} />
          <path d={RIGHT_PURKINJE + ' ' + LEFT_PURKINJE} stroke="transparent" strokeWidth="18" />
        </g>

        <TeachingHeartLabels />

        {/* Muted level guides are orientation references, not conduction paths
            or precise anatomical planes. Only their side labels are interactive. */}
        <g fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2 6" pointerEvents="none">
          <path d="M76 214 H310" />
          <path d="M54 410 H332" />
        </g>
        <g fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="600">
          <g {...interactive('base')} aria-pressed={active === 'base'} fill={active === 'base' ? '#7dd3fc' : '#e5e7eb'}>
            <rect x="2" y="186" width="72" height="36" rx="4" fill={active === 'base' ? '#163044' : 'transparent'} />
            <text x="5" y="201" fontSize="11">Ventricular</text>
            <text x="5" y="216">base</text>
          </g>
          <g {...interactive('apex')} aria-pressed={active === 'apex'} fill={active === 'apex' ? '#7dd3fc' : '#e5e7eb'}>
            <rect x="2" y="393" width="48" height="30" rx="4" fill={active === 'apex' ? '#163044' : 'transparent'} />
            <text x="5" y="414">Apex</text>
          </g>
        </g>

        <TransverseVentricularInset active={active} prefix="Anatomy diagram" />
      </svg>

    </div>
  )
}
import {
  HEART_VIEW_BOX, RIGHT_BUNDLE, LEFT_BUNDLE, RIGHT_PURKINJE, LEFT_PURKINJE,
  ATRIAL_MYOCARDIUM, ATRIAL_SEPTUM, BACHMANN_BUNDLE, AV_BOUNDARY, SA_NODE, AV_NODE, HIS_PATH,
  RIGHT_ATRIUM, LEFT_ATRIUM,
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
