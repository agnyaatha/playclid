import type { Body } from "@/core/types";

/** Distance from point p to the segment a-b. */
function segmentDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Can the cue ball hit the full extent of this ball? The cue ball's path must be clear when it touches the ball at
 * either extreme edge. Those are the two positions the cue ball centre takes when it is a ball-pair distance from the
 * target, level with the target's sides as seen from the cue ball.
 */
function canSeeFullBall(white: Body, target: Body, others: Body[]): boolean {
  const dx = target.position.x - white.position.x;
  const dy = target.position.y - white.position.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return true;
  const nx = -dy / len;
  const ny = dx / len;
  const reach = target.radius + white.radius;
  return [1, -1].every((side) => {
    const g = { x: target.position.x + nx * reach * side, y: target.position.y + ny * reach * side };
    return others.every((o) => segmentDistance(o.position, white.position, g) >= o.radius + white.radius);
  });
}

/**
 * A player is snookered when the cue ball cannot hit the full extent of any ball on, because other balls are in
 * the way. After a foul, a snookered incoming player gets a free ball.
 */
export function isSnookered(bodies: Body[], onIds: string[]): boolean {
  const white = bodies.find((b) => b.id === "white" && b.state !== "pocketed");
  if (!white) return false;
  const live = bodies.filter((b) => b.state !== "pocketed" && b.id !== "white");
  const targets = live.filter((b) => onIds.includes(b.id));
  if (targets.length === 0) return false;
  return targets.every((t) => !canSeeFullBall(white, t, live.filter((o) => o.id !== t.id)));
}
