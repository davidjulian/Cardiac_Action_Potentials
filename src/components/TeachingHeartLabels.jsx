// Sparse horizontal labels and short leaders keep the wave field readable.
export default function TeachingHeartLabels() {
  return (
    <g fontFamily="system-ui, sans-serif" pointerEvents="none">
      <g fill="#cbd5e1" fontSize="11" fontWeight="500">
        <text x="16" y="25">Patient’s right</text>
        <text x="364" y="25" textAnchor="end">Patient’s left</text>
        <text x="190" y="49" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="1.5">CONDUCTION SCHEMATIC</text>
      </g>
      <g fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M55 103 H91" />
        <path d="M190 76 V94" />
        <path d="M54 186 H167 L180 182" />
        <path d="M310 222 H210" />
        <path d="M315 351 H290" />
      </g>
      <g fill="#e2e8f0" fontSize="11" fontWeight="600">
        <text x="9" y="99">SA node</text>
        <text x="190" y="71" textAnchor="middle">Bachmann’s bundle</text>
        <text x="9" y="182">AV node</text>
        <text x="315" y="225">His</text>
        <text x="315" y="345">Purkinje</text>
        <text x="315" y="359">fibers</text>
      </g>
      <g fill="#e2e8f0" fontSize="15" fontWeight="600" textAnchor="middle">
        <text x="129" y="150">RA</text>
        <text x="251" y="150">LA</text>
        <text x="124" y="298">RV</text>
        <text x="244" y="307">LV</text>
      </g>
    </g>
  )
}
