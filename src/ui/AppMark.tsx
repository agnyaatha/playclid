/**
 * The PlayClid mark: a thick brass C round an ivory cue ball. This is public/icon.svg without its dark tile, for places
 * that already sit on a dark background. Plain SVG, so it also renders inside ImageResponse for the link-preview cards.
 */
export function AppMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="9 9 46 46" aria-hidden="true">
      <path d="M45.75 19.62 A18.5 18.5 0 1 0 45.75 44.38" fill="none" stroke="#d4a94e" strokeWidth="9" strokeLinecap="round" />
      <circle cx="32" cy="32" r="6.5" fill="#f0e9d8" />
    </svg>
  );
}
