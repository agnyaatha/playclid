/** A tiny looping table for each step of the first-run tour. Pure CSS, so it costs nothing and honours reduced motion. */
export function TourAnimation({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 320 120" className="tour-demo" role="img" aria-label={["The aim line swinging to follow your finger", "Pulling back from the ball to build power", "The ball struck into another, which drops in the pocket"][step]}>
      <rect x="1" y="1" width="318" height="118" rx="10" fill="#5a3a1e" />
      <rect x="11" y="11" width="298" height="98" rx="3" fill="var(--felt)" />
      <circle cx="14" cy="14" r="9" fill="#050505" />
      <circle cx="306" cy="14" r="9" fill="#050505" />
      <circle cx="14" cy="106" r="9" fill="#050505" />
      <circle cx="306" cy="106" r="9" fill="#050505" />

      {step === 0 && (
        <>
          <circle cx="240" cy="60" r="7" fill="#c8322a" />
          <g className="tour-sweep">
            <line x1="78" y1="60" x2="262" y2="60" stroke="var(--chalk)" strokeWidth="2" strokeDasharray="6 6" />
            <circle cx="268" cy="60" r="11" fill="rgba(240,233,216,0.25)" stroke="var(--chalk)" strokeWidth="1.5" />
          </g>
          <circle cx="70" cy="60" r="7" fill="var(--chalk)" />
        </>
      )}

      {step === 1 && (
        <>
          <g className="tour-pull">
            <rect x="-40" y="58" width="96" height="4" rx="2" fill="#c79a5b" />
            <circle cx="46" cy="60" r="11" fill="rgba(240,233,216,0.25)" stroke="var(--chalk)" strokeWidth="1.5" />
          </g>
          <circle cx="110" cy="60" r="7" fill="var(--chalk)" />
          <line x1="118" y1="60" x2="250" y2="60" stroke="var(--chalk)" strokeWidth="2" strokeDasharray="6 6" />
          <rect x="130" y="24" width="120" height="6" rx="3" fill="rgba(11,15,13,0.55)" />
          <rect className="tour-meter" x="130" y="24" width="120" height="6" rx="3" fill="var(--brass)" />
        </>
      )}

      {step === 2 && (
        <>
          <circle className="tour-pocket" cx="306" cy="106" r="16" fill="var(--brass)" />
          <circle className="tour-object" cx="196" cy="70" r="7" fill="#c8322a" />
          <circle className="tour-cue" cx="60" cy="42" r="7" fill="var(--chalk)" />
        </>
      )}
    </svg>
  );
}
