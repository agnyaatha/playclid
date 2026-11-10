import type { CushionSegment, Pocket, Table } from "@/core/types";

export interface PlanPoint {
  x: number;
  y: number;
}

export interface PocketOpening {
  centre: PlanPoint;
  radius: number;
  /** The gap between the jaw tips and the pocket, so no cloth shows behind the mouth. */
  throat: PlanPoint[] | null;
}

/** Where a pocket's dark opening sits: pushed out from the cloth so that it bites into the rail, as on a real table. */
export function pocketOpening(p: Pocket, table: Table, band: number): PocketOpening {
  const side = (v: number, size: number) => (v < 1e-9 ? -1 : v > size - 1e-9 ? 1 : 0);
  const sx = side(p.position.x, table.width);
  const sy = side(p.position.y, table.length);
  const push = band * (sx !== 0 && sy !== 0 ? 0.35 : 0.5);
  const centre = { x: p.position.x + sx * push, y: p.position.y + sy * push };
  return { centre, radius: p.drawRadius ?? p.radius * 1.28, throat: p.mouth ? [p.mouth.a, p.mouth.b, centre] : null };
}

/** A maximum with its corner smoothed over a width of about `k`, which turns a cusp into a fillet. */
const softMax = (a: number, b: number, k: number) => 0.5 * (a + b + Math.sqrt((a - b) ** 2 + k * k));

/**
 * The inner edge of the rail: the rectangle around the cushions, flowing smoothly into a round notch at each pocket.
 * Each point of the rectangle near an opening is pushed radially out to the opening's circle.
 */
export function railOpening(table: Table, band: number): PlanPoint[] {
  const openings = table.pockets.filter((p) => !p.unmarked).map((p) => pocketOpening(p, table, band));
  const blend = band * 0.35;
  const near = (q: PlanPoint) => openings.find((o) => Math.hypot(q.x - o.centre.x, q.y - o.centre.y) < o.radius + 6 * blend);
  const soften = (q: PlanPoint): PlanPoint => {
    const o = near(q);
    if (!o) return q;
    const dx = q.x - o.centre.x;
    const dy = q.y - o.centre.y;
    const d = Math.max(Math.hypot(dx, dy), 1e-6);
    const reach = softMax(d, o.radius, blend);
    return { x: o.centre.x + (dx / d) * reach, y: o.centre.y + (dy / d) * reach };
  };

  const W = table.width;
  const L = table.length;
  const corners = [
    { x: -band, y: -band },
    { x: W + band, y: -band },
    { x: W + band, y: L + band },
    { x: -band, y: L + band },
  ];
  const fine = Math.max(band * 0.08, 0.001);
  const points: PlanPoint[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = 0; s < len; ) {
      const q = { x: a.x + ((b.x - a.x) * s) / len, y: a.y + ((b.y - a.y) * s) / len };
      points.push(soften(q));
      s += near(q) ? fine : Math.min(fine * 12, 0.05);
    }
  });
  return points;
}

const ARC_STEPS = 14;

/**
 * A cushion seen from above. The nose lies on the physics cushion line and its two ends are rounded back towards the
 * rail. The rounding is small next to a ball, so what a ball appears to bounce from still matches the jaw tip.
 */
export function cushionOutline(c: CushionSegment, table: Table, band: number): PlanPoint[] {
  const len = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y);
  const d = { x: (c.b.x - c.a.x) / len, y: (c.b.y - c.a.y) / len };
  const mid = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 };
  let n = { x: -d.y, y: d.x };
  if (n.x * (mid.x - table.width / 2) + n.y * (mid.y - table.length / 2) < 0) n = { x: -n.x, y: -n.y };

  if (c.mitre !== undefined) {
    const back = (o: PlanPoint, along: number) => ({ x: o.x + d.x * along + n.x * band, y: o.y + d.y * along + n.y * band });
    return [c.a, c.b, back(c.b, c.mitre), back(c.a, -c.mitre)];
  }

  // Short along the nose, where a ball can reach it, and deep enough to leave no flat wall behind the curve.
  const along = Math.min(band * 0.5, len / 2);
  const out = band * 0.98;
  const at = (o: PlanPoint, a: number, b: number) => ({ x: o.x + d.x * a + n.x * b, y: o.y + d.y * a + n.y * b });
  /** A quarter ellipse about `o`, starting at angle `from` in the (along, out) plane. */
  const arc = (o: PlanPoint, from: number) =>
    Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
      const t = from + (i * Math.PI) / (2 * ARC_STEPS);
      return at(o, Math.cos(t) * along, Math.sin(t) * out);
    });

  return [at(c.a, 0, band), ...arc(at(c.a, along, out), Math.PI), ...arc(at(c.b, -along, out), -Math.PI / 2), at(c.b, 0, band)];
}
