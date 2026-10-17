/** Abstract route-network illustration used when no hero photo has been uploaded. */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glow" cx="72%" cy="38%" r="60%">
          <stop offset="0" stopColor="#3b5891" stopOpacity=".55" />
          <stop offset="1" stopColor="#0a1329" stopOpacity="0" />
        </radialGradient>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#8ea6cc" opacity=".18" />
        </pattern>
      </defs>
      <rect width="800" height="600" fill="#0f1c3b" />
      <rect width="800" height="600" fill="url(#dots)" />
      <rect width="800" height="600" fill="url(#glow)" />
      <g fill="none" strokeLinecap="round">
        <path d="M80 470 C 260 300, 420 260, 610 180" stroke="#5c7aae" strokeWidth="1.5" strokeDasharray="2 7" opacity=".7" />
        <path d="M140 160 C 330 230, 470 330, 700 420" stroke="#5c7aae" strokeWidth="1.5" strokeDasharray="2 7" opacity=".55" />
        <path d="M300 540 C 380 400, 520 300, 740 260" stroke="#d4302f" strokeWidth="2" opacity=".75" />
        <path d="M40 300 C 220 280, 460 210, 610 180" stroke="#8ea6cc" strokeWidth="1.2" opacity=".35" />
      </g>
      <g>
        {[
          [80, 470],
          [610, 180],
          [140, 160],
          [700, 420],
          [300, 540],
          [740, 260],
          [40, 300],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="11" fill="#d4302f" opacity={i === 1 ? 0.25 : 0} />
            <circle cx={x} cy={y} r="4" fill={i === 1 ? "#ffffff" : "#bccbe3"} />
          </g>
        ))}
      </g>
    </svg>
  );
}
