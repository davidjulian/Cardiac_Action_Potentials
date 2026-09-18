export default function TransverseVentricularInset({ active = null, prefix = 'heart' }) {
  const rvActive = active === 'rv'
  const lvActive = active === 'lv'
  return (
    <g transform="translate(64 438)" aria-label="Transverse ventricular geometry inset">
      <text x="126" y="0" textAnchor="middle" fill="#e5e7eb" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">
        Transverse view
      </text>

      <ellipse
        cx="157" cy="34" rx="39" ry="30"
        fill={lvActive ? '#166534' : '#543940'}
        stroke={lvActive ? '#86efac' : '#b99299'}
        strokeWidth={lvActive ? 3 : 2}
      />
      <ellipse cx="157" cy="34" rx="22" ry="16" fill="#101b2b" stroke="#a67b84" strokeWidth="1.5" />

      <path
        d="M119 10 C83 9 60 24 60 40 C60 57 84 70 120 61 C105 55 97 46 97 36 C97 25 105 16 119 10 Z"
        fill={rvActive ? '#166534' : '#543940'}
        stroke={rvActive ? '#86efac' : '#b99299'}
        strokeWidth={rvActive ? 3 : 2}
      />
      <path d="M104 20 C83 20 70 28 70 39 C70 50 84 57 105 54 C95 45 94 31 104 20 Z" fill="#101b2b" stroke="#a67b84" strokeWidth="1.5" />

      <text x="79" y="43" textAnchor="middle" fill="#f3f4f6" fontSize="10" fontWeight="700">RV</text>
      <text x="157" y="38" textAnchor="middle" fill="#f3f4f6" fontSize="10" fontWeight="700">LV</text>
      <text x="126" y="77" textAnchor="middle" fill="#e5e7eb" fontSize="10.5" fontWeight="600" fontFamily="system-ui, sans-serif">
        RV wraps anteriorly around LV
      </text>
      <text x="126" y="91" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontFamily="system-ui, sans-serif">
        2D section area ≠ chamber volume
      </text>
      <title>{`${prefix}: The right ventricle wraps around the left ventricle in transverse section.`}</title>
    </g>
  )
}
