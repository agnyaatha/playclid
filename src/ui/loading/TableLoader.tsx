/** Corner and side pockets of the little table, in the drawing's coordinates. */
const POCKETS = [
  [14, 14],
  [120, 11],
  [226, 14],
  [14, 96],
  [120, 99],
  [226, 96],
];
const CORNERS = [POCKETS[0], POCKETS[2], POCKETS[3], POCKETS[5]];

/**
 * A little looping game on a little table: a cue strikes a ball into a pocket, or on a board a striker sends a coin
 * in. Pure CSS, so it runs before any JavaScript has loaded.
 */
export function TableLoader({ shape = "sphere", label = "Setting up the table", compact = false }: { shape?: "sphere" | "disc"; label?: string; compact?: boolean }) {
  const disc = shape === "disc";
  return (
    <div role="status" className={`table-loader ${compact ? "table-loader-compact" : ""}`}>
      <svg viewBox="0 0 240 110" aria-hidden>
        <rect width="240" height="110" rx="9" fill={disc ? "#4a2a13" : "#5a3a1e"} />
        <rect x="10" y="10" width="220" height="90" rx="2" fill={disc ? "#dcbd8b" : "var(--felt)"} />
        {(disc ? CORNERS : POCKETS).map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={disc ? 7 : 8} fill="#050505" />
        ))}
        <circle className="load-glow" cx="226" cy="14" r="15" fill="#f5d48a" />
        {!disc && (
          <g className="load-cue">
            <line x1="46" y1="100" x2="-30" y2="136" stroke="#c79a5b" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="46" y1="100" x2="43" y2="101.4" stroke="#3f7fb3" strokeWidth="3.5" />
          </g>
        )}
        <circle className="load-target" cx="140" cy="55" r={disc ? 5.5 : 6} fill={disc ? "#23201d" : "#c8322a"} />
        <circle className="load-striker" cx="54" cy="96" r={disc ? 8 : 6} fill="#f0e9d8" />
      </svg>
      <p className="load-label">{label}</p>
    </div>
  );
}
