import { makeRng } from "../ai/rng";
import type { GameId } from "../game";
import { pocketAimPoint } from "../table";
import type { Body, Table } from "../types";
import type { LayoutBall } from "./schema";

/** A scattered table with marked targets to pot within a limited number of shots. Balls stay where they stop. */
export interface Challenge {
  id: string;
  gameId: GameId;
  tier: 1 | 2 | 3;
  title: string;
  goal: string;
  layout: LayoutBall[];
  targets: string[];
  shots: number;
}

export const TIER_NAMES = { 1: "Warm-up", 2: "Club", 3: "Hard" } as const;

/** Everything a game supplies to have challenges generated for it. */
export interface ChallengeKit {
  gameId: GameId;
  table: Table;
  radius: number;
  strikerId: string;
  /** Where the striker starts, given a random source. */
  striker: (rng: () => number) => { x: number; y: number };
  /** Ball ids to mark as targets, in the order they are used. */
  targets: string[];
  blockers: string[];
  /** How a target is named in the goal text. */
  name: (id: string) => string;
  /** Places no ball may be scattered, e.g. the striker's baseline. */
  keepOut?: (p: { x: number; y: number }) => boolean;
  /** Shifts the seeds, for two games that would otherwise generate the same layouts. */
  seedOffset?: number;
}

interface Spec {
  tier: Challenge["tier"];
  title: string;
  targets: number;
  blockers: number;
  shots: number;
  seed: number;
}

const SPECS: Spec[] = [
  { tier: 1, title: "First look", targets: 1, blockers: 3, shots: 3, seed: 101 },
  { tier: 1, title: "Clear view", targets: 1, blockers: 4, shots: 3, seed: 202 },
  { tier: 1, title: "A little traffic", targets: 1, blockers: 5, shots: 3, seed: 303 },
  { tier: 2, title: "Two to find", targets: 2, blockers: 6, shots: 5, seed: 404 },
  { tier: 2, title: "Either way", targets: 2, blockers: 7, shots: 5, seed: 505 },
  { tier: 2, title: "Crowded middle", targets: 2, blockers: 8, shots: 4, seed: 606 },
  { tier: 3, title: "Three's a crowd", targets: 3, blockers: 8, shots: 6, seed: 707 },
  { tier: 3, title: "Minefield", targets: 3, blockers: 9, shots: 5, seed: 808 },
  { tier: 3, title: "The gauntlet", targets: 3, blockers: 9, shots: 4, seed: 909 },
];

/** Shortest distance from point p to the segment a-b. */
function toSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Cuts thinner than this are not fair to count as a pot that is "on". */
const MAX_CUT_COS = 0.5;

/** Is there a clean line from the striker to the target and on into some pocket? */
function hasDirectPot(kit: ChallengeKit, striker: { x: number; y: number }, target: { x: number; y: number }, others: { x: number; y: number }[]) {
  const gap = 2.1 * kit.radius;
  return kit.table.pockets.some((pocket) => {
    const aim = pocketAimPoint(pocket);
    const ul = Math.hypot(aim.x - target.x, aim.y - target.y);
    const u = { x: (aim.x - target.x) / ul, y: (aim.y - target.y) / ul };
    const ghost = { x: target.x - u.x * 2 * kit.radius, y: target.y - u.y * 2 * kit.radius };
    const al = Math.hypot(ghost.x - striker.x, ghost.y - striker.y);
    if (al < 3 * kit.radius) return false;
    const cos = ((ghost.x - striker.x) * u.x + (ghost.y - striker.y) * u.y) / al;
    return cos > MAX_CUT_COS && others.every((o) => toSegment(o, target, aim) > gap && toSegment(o, striker, ghost) > gap);
  });
}

/** One attempt at a layout from a random source; null if the balls would not fit or a target has no pot on. */
function scatter(kit: ChallengeKit, spec: Spec, rng: () => number): LayoutBall[] | null {
  const { table, radius: R } = kit;
  const striker = kit.striker(rng);
  const placed: { x: number; y: number }[] = [striker];
  const margin = 2.5 * R;

  const free = (p: { x: number; y: number }) =>
    p.x > margin &&
    p.x < table.width - margin &&
    p.y > margin &&
    p.y < table.length - margin &&
    placed.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= 3.2 * R) &&
    table.pockets.every((k) => Math.hypot(p.x - k.position.x, p.y - k.position.y) >= k.radius + 5 * R) &&
    !kit.keepOut?.(p);

  const pick = (near?: { x: number; y: number }) => {
    const spread = table.width * 0.55;
    for (let i = 0; i < 300; i++) {
      const p = near ? { x: near.x + (rng() - 0.5) * spread, y: near.y + (rng() - 0.5) * spread } : { x: rng() * table.width, y: rng() * table.length };
      if (free(p)) {
        placed.push(p);
        return p;
      }
    }
    return null;
  };

  const targets: { x: number; y: number }[] = [];
  for (let i = 0; i < spec.targets; i++) {
    const p = pick();
    if (!p) return null;
    targets.push(p);
  }
  const blockers: { x: number; y: number }[] = [];
  for (let i = 0; i < spec.blockers; i++) {
    // Half the blockers crowd the targets, so the table is busy where it matters.
    const p = pick(i % 2 === 0 ? targets[i % targets.length] : undefined);
    if (!p) return null;
    blockers.push(p);
  }

  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  const all = [...targets, ...blockers];
  if (!targets.every((t) => hasDirectPot(kit, striker, t, all.filter((o) => o !== t)))) return null;
  return [
    { id: kit.strikerId, x: round(striker.x), y: round(striker.y) },
    ...targets.map((t, i) => ({ id: kit.targets[i], x: round(t.x), y: round(t.y) })),
    ...blockers.map((b, i) => ({ id: kit.blockers[i], x: round(b.x), y: round(b.y) })),
  ];
}

/** "black, pink and blue"; repeats are counted, as in "queen and 2 white coins". */
function listNames(names: string[]) {
  const parts = [...new Set(names)].map((n) => {
    const count = names.filter((x) => x === n).length;
    return count > 1 ? `${count} ${n}s` : n;
  });
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** A game's full set of challenges. The same every time, since each layout comes from a fixed seed. */
export function makeChallenges(kit: ChallengeKit): Challenge[] {
  return SPECS.map((spec, n) => {
    let layout: LayoutBall[] | null = null;
    const first = spec.seed + (kit.seedOffset ?? 0);
    for (let seed = first; !layout && seed < first + 3000; seed++) layout = scatter(kit, spec, makeRng(seed));
    if (!layout) throw new Error(`No layout found for ${kit.gameId} challenge "${spec.title}"`);
    const targets = kit.targets.slice(0, spec.targets);
    return {
      id: `c${n + 1}`,
      gameId: kit.gameId,
      tier: spec.tier,
      title: spec.title,
      goal: `Pot the ${listNames(targets.map(kit.name))} in ${spec.shots} shots or fewer. Everything else is in the way.`,
      layout,
      targets,
      shots: spec.shots,
    };
  });
}

/** Targets still on the table. */
export const targetsLeft = (c: Challenge, bodies: Body[]) => c.targets.filter((id) => bodies.some((b) => b.id === id && b.state !== "pocketed"));

/** Three stars for one shot per target, none for running out, and two if at least half the spare shots were left. */
export function challengeStars(c: Challenge, shotsUsed: number, cleared: boolean): 0 | 1 | 2 | 3 {
  if (!cleared) return 0;
  const spare = c.shots - c.targets.length;
  if (shotsUsed <= c.targets.length) return 3;
  return shotsUsed <= c.targets.length + Math.ceil(spare / 2) ? 2 : 1;
}

/** Slide a respotted striker along the table until it is clear of every other ball. */
export function clearOfBalls(bodies: Body[], strikerId: string, table: Table): Body[] {
  const striker = bodies.find((b) => b.id === strikerId);
  if (!striker || striker.state === "pocketed") return bodies;
  const hits = (x: number, y: number) => bodies.some((o) => o.id !== strikerId && o.state !== "pocketed" && Math.hypot(o.position.x - x, o.position.y - y) < o.radius + striker.radius + 1e-6);
  const { x, y } = striker.position;
  for (let d = 0; d < table.length; d += striker.radius) {
    for (const ny of [y + d, y - d]) {
      if (ny > striker.radius && ny < table.length - striker.radius && !hits(x, ny)) {
        return bodies.map((b) => (b.id === strikerId ? { ...b, position: { ...b.position, y: ny } } : b));
      }
    }
  }
  return bodies;
}
