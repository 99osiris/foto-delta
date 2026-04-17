interface VhessLogoProps {
  size?: 'topbar' | 'full'
}

export default function VhessLogo({ size = 'topbar' }: VhessLogoProps) {
  if (size === 'topbar') {
    return (
      <svg
        width="96"
        height="22"
        viewBox="0 0 260 58"
        style={{ display: 'block', flexShrink: 0 }}
        aria-label="VHESS"
      >
        {/* Corps principal caméscope */}
        <rect x="10" y="7" width="90" height="46" rx="3" fill="#0f0f0f" stroke="#252525" strokeWidth="0.6"/>

        {/* Fenêtre objectif */}
        <rect x="15" y="13" width="40" height="28" rx="2" fill="#080808" stroke="#1a1a1a" strokeWidth="0.4"/>

        {/* Objectif — 4 cercles concentriques */}
        <circle cx="35" cy="27" r="11" fill="#070707" stroke="#1d1d1d" strokeWidth="0.5"/>
        <circle cx="35" cy="27" r="7.5" fill="#050505" stroke="#161616" strokeWidth="0.4"/>
        <circle cx="35" cy="27" r="4.5" fill="#0a0a0a" stroke="#1d1d1d" strokeWidth="0.5"/>
        <circle cx="35" cy="27" r="2" fill="#111"/>
        <circle cx="32.5" cy="24.5" r="0.8" fill="#2a2a2a"/>

        {/* Panneau infos LCD */}
        <rect x="59" y="17" width="33" height="22" rx="1" fill="#080808" stroke="#1a1a1a" strokeWidth="0.4"/>
        <rect x="62" y="20" width="27" height="2.5" rx="0.5" fill="#0f0f0f" stroke="#151515" strokeWidth="0.2"/>
        <rect x="62" y="25" width="18" height="1.2" rx="0.5" fill="#1a3a2a"/>
        <rect x="81" y="25" width="7" height="1.2" rx="0.5" fill="#161616"/>
        <rect x="62" y="29" width="9" height="2" rx="0.5" fill="#161616"/>
        <rect x="73" y="29" width="5" height="2" rx="0.5" fill="#4ade80" opacity="0.45"/>

        {/* Séparation corps/grip */}
        <rect x="88" y="7" width="3" height="46" fill="#0a0a0a"/>

        {/* Grip latéral */}
        <rect x="91" y="10" width="22" height="42" rx="3" fill="#0d0d0d" stroke="#1d1d1d" strokeWidth="0.5"/>
        <rect x="95" y="15" width="14" height="25" rx="1" fill="#080808" stroke="#151515" strokeWidth="0.2"/>
        <circle cx="102" cy="46" r="4.5" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.4"/>
        <circle cx="102" cy="46" r="2" fill="#080808"/>

        {/* Slot cassette VHS-C */}
        <rect x="113" y="14" width="12" height="32" rx="2" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.5"/>
        <rect x="116" y="17" width="6" height="12" rx="0.5" fill="#070707" stroke="#141414" strokeWidth="0.3"/>
        <rect x="116" y="31" width="6" height="12" rx="0.5" fill="#070707" stroke="#141414" strokeWidth="0.3"/>

        {/* Nom VHESS */}
        <text
          x="178"
          y="36"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="'Courier New', monospace"
          fontSize="28"
          fontWeight="700"
          letterSpacing="7"
        >
          VHESS
        </text>
      </svg>
    )
  }

  return (
    <svg
      width="260"
      height="110"
      viewBox="0 0 260 110"
      style={{ display: 'block' }}
      aria-label="VHESS"
    >
      <rect x="10" y="18" width="155" height="78" rx="5" fill="#0f0f0f" stroke="#2a2a2a" strokeWidth="0.8"/>
      <rect x="19" y="27" width="72" height="48" rx="3" fill="#080808" stroke="#1e1e1e" strokeWidth="0.5"/>
      <circle cx="55" cy="51" r="20" fill="#080808" stroke="#222" strokeWidth="0.8"/>
      <circle cx="55" cy="51" r="14" fill="#060606" stroke="#181818" strokeWidth="0.6"/>
      <circle cx="55" cy="51" r="8" fill="#0c0c0c" stroke="#222" strokeWidth="0.8"/>
      <circle cx="55" cy="51" r="3.5" fill="#141414"/>
      <circle cx="51" cy="47" r="1.2" fill="#2a2a2a"/>
      <rect x="101" y="34" width="55" height="34" rx="2" fill="#090909" stroke="#1a1a1a" strokeWidth="0.5"/>
      <rect x="106" y="39" width="45" height="4" rx="1" fill="#0f0f0f" stroke="#161616" strokeWidth="0.3"/>
      <rect x="106" y="46" width="30" height="1.5" rx="0.5" fill="#1a3a2a"/>
      <rect x="138" y="46" width="13" height="1.5" rx="0.5" fill="#1a1a1a"/>
      <rect x="106" y="51" width="14" height="2.5" rx="1" fill="#1a1a1a"/>
      <rect x="122" y="51" width="6" height="2.5" rx="1" fill="#4ade80" opacity="0.5"/>
      <rect x="106" y="57" width="45" height="7" rx="1" fill="#070707" stroke="#161616" strokeWidth="0.3"/>
      <text x="128" y="63" textAnchor="middle" fill="#2a2a2a" fontFamily="'Courier New',monospace" fontSize="5" letterSpacing="0.5">00:00:00</text>
      <rect x="18" y="83" width="10" height="8" rx="1.5" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <rect x="32" y="83" width="8" height="8" rx="1.5" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <rect x="44" y="84" width="6" height="6" rx="1" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <rect x="54" y="84" width="6" height="6" rx="1" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <rect x="148" y="18" width="5" height="78" fill="#111"/>
      <rect x="153" y="22" width="38" height="70" rx="4" fill="#0d0d0d" stroke="#222" strokeWidth="0.8"/>
      <rect x="158" y="28" width="28" height="44" rx="2" fill="#080808" stroke="#181818" strokeWidth="0.3"/>
      <rect x="162" y="32" width="20" height="7" rx="1" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.3"/>
      <rect x="162" y="42" width="20" height="1" fill="#161616"/>
      <rect x="162" y="46" width="20" height="1" fill="#161616"/>
      <rect x="162" y="50" width="20" height="1" fill="#161616"/>
      <rect x="162" y="54" width="20" height="1" fill="#161616"/>
      <circle cx="172" cy="82" r="7" fill="#0a0a0a" stroke="#1f1f1f" strokeWidth="0.5"/>
      <circle cx="172" cy="82" r="3.5" fill="#080808"/>
      <rect x="191" y="30" width="58" height="46" rx="3" fill="#0a0a0a" stroke="#1a1a1a" strokeWidth="0.5"/>
      <rect x="195" y="34" width="50" height="38" rx="1" fill="#070707" stroke="#141414" strokeWidth="0.3"/>
      <text x="220" y="57" textAnchor="middle" fill="#222" fontFamily="'Courier New',monospace" fontSize="6" letterSpacing="2" transform="rotate(90 220 57)">VHS-C</text>
      <text x="130" y="11" textAnchor="middle" fill="#ffffff" fontFamily="'Courier New',monospace" fontSize="16" fontWeight="700" letterSpacing="5">VHESS</text>
      <text x="130" y="107" textAnchor="middle" fill="#252525" fontFamily="'Courier New',monospace" fontSize="6" letterSpacing="3">ANALOG FILTER</text>
    </svg>
  )
}
