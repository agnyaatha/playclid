import type { ControlState, Game } from "../game";
import type { SimParams } from "../sim/params";
import { pocketAimPoint } from "../table";
import type { Body, ShotResult, Table } from "../types";
import { gaussian, makeRng } from "./rng";

/** How precisely a player executes a shot, and how hard the advisor looks for a good one. */
export interface Skill {
  /** Standard deviation of aim error, radians. */
  aimSigma: number;
  /** Standard deviation of power error as a fraction of the power chosen. */
  powerSigma: number;
  /** Monte Carlo samples per candidate when estimating the chance of potting. */
  samples: number;
}

export const SKILLS = {
  beginner: { aimSigma: 0.014, powerSigma: 0.14, samples: 6 },
  club: { aimSigma: 0.006, powerSigma: 0.07, samples: 8 },
  expert: { aimSigma: 0.0025, powerSigma: 0.035, samples: 10 },
} as const satisfies Record<string, Skill>;

export type SkillName = keyof typeof SKILLS;

/** A ball the shooter may play, and what potting it is worth. */
export interface Target {
  id: string;
  value: number;
}

export interface AdviceRequest {
  bodies: Body[];
  targets: Target[];
  skill: Skill;
  seed?: number;
  /** Penalty (in points) for a foul such as potting the cue ball. */
  foulPenalty?: number;
  /** Physics parameters to search with (the player's table-speed setting); defaults to the game's own. */
  params?: SimParams;
}

export interface Suggestion {
  controls: ControlState;
  kind: "pot" | "safety";
  target: string;
  pocket: string | null;
  /** Estimated chance of potting the target (pots) or of a clean contact (safeties), 0 to 1. */
  probability: number;
  /** Expected points: probability times value, less the expected foul penalty. */
  expectedValue: number;
  note: string;
}

const POWERS = [0.2, 0.3, 0.42, 0.58, 0.75, 0.9];
const SAFETY_POWERS = [0.1, 0.16, 0.24];
const MAX_CUT = (75 * Math.PI) / 180;
/** Candidate checks only need the first few events, so cap them: a shot into a tight pack can otherwise cascade. */
const SIM = { maxTime: 14, maxEvents: 60 };
/** Total simulations allowed per request, so a suggestion always returns promptly (and deterministically). */
const SIM_BUDGET = 450;
const CLEARANCE = 1.0;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Distance from point p to the segment a-b. */
function segmentDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Is a ball of `radius` travelling a-b free of every other ball? (Cheap geometric filter before simulating.) */
function pathClear(a: { x: number; y: number }, b: { x: number; y: number }, bodies: Body[], ignore: string[], radius: number) {
  return bodies.every(
    (o) => o.state === "pocketed" || ignore.includes(o.id) || segmentDistance(o.position, a, b) >= (o.radius + radius) * CLEARANCE,
  );
}

function ghostAim(striker: Body, target: Body, aimAt: { x: number; y: number }) {
  const ux = aimAt.x - target.position.x;
  const uy = aimAt.y - target.position.y;
  const ul = Math.hypot(ux, uy);
  if (ul < 1e-9) return null;
  const R = target.radius + striker.radius;
  const ghost = { x: target.position.x - (ux / ul) * R, y: target.position.y - (uy / ul) * R };
  const aim = Math.atan2(ghost.y - striker.position.y, ghost.x - striker.position.x);
  // Cut angle: between the cue ball's line to the target and the target's line to the pocket.
  const toTarget = Math.atan2(target.position.y - striker.position.y, target.position.x - striker.position.x);
  const toPocket = Math.atan2(uy, ux);
  let cut = Math.abs(toTarget - toPocket);
  if (cut > Math.PI) cut = 2 * Math.PI - cut;
  return { aim, ghost, cut };
}

/** Did this shot pot `targetId` first, without potting the striker before it? */
function potted(result: ShotResult, targetId: string, strikerId: string): { ok: boolean; whiteFirst: boolean } {
  for (const e of result.events) {
    if (e.type !== "pocket") continue;
    if (e.body === strikerId) return { ok: false, whiteFirst: true };
    if (e.body === targetId) return { ok: true, whiteFirst: false };
  }
  return { ok: false, whiteFirst: false };
}

function simulate(game: Game, table: Table, bodies: Body[], c: ControlState, stop = false): ShotResult {
  return game.simulate(table, bodies, game.input.buildShot(c), {
    ...SIM,
    stopWhen: stop ? (e) => e.type === "pocket" : undefined,
  });
}

/** The same game, simulating with different physics parameters. */
export function withParams(game: Game, params?: SimParams): Game {
  if (!params) return game;
  return { ...game, simulate: (t, b, shot, opts) => game.simulate(t, b, shot, { ...opts, params }) };
}

/** Execute a planned shot the way a player of this skill would: with aim and power noise. */
export function perturb(c: ControlState, skill: Skill, rng: () => number): ControlState {
  return {
    ...c,
    aim: c.aim + gaussian(rng) * skill.aimSigma,
    power: Math.min(1, Math.max(0.02, c.power * (1 + gaussian(rng) * skill.powerSigma))),
  };
}

/**
 * Find the best shot for the current position. Pots come first: ghost-ball aim at each target and pocket, checked
 * on a scratch copy of the table with the real physics, then the survivors are scored by Monte Carlo with the
 * player's skill noise. If nothing pots reliably, a gentle safety shot is chosen instead.
 */
export function suggestShot(baseGame: Game, table: Table, req: AdviceRequest): Suggestion | null {
  const game = withParams(baseGame, req.params);
  const strikerId = game.input.strikerId;
  const striker = req.bodies.find((b) => b.id === strikerId);
  if (!striker || striker.state === "pocketed") return null;
  const rng = makeRng(req.seed ?? 1);
  const foul = req.foulPenalty ?? 4;
  const onTable = (id: string) => req.bodies.find((b) => b.id === id && b.state !== "pocketed");

  interface Candidate {
    controls: ControlState;
    target: Target;
    pocket: string;
  }
  const clean: Candidate[] = [];
  let sims = 0;

  for (const t of req.targets) {
    const target = onTable(t.id);
    if (!target) continue;
    for (const pocket of table.pockets) {
      const aimAt = pocketAimPoint(pocket);
      const g = ghostAim(striker, target, aimAt);
      if (!g || g.cut > MAX_CUT) continue;
      // Cheap geometric filter: the cue ball must reach the ghost ball, and the target must reach the pocket.
      if (!pathClear(striker.position, g.ghost, req.bodies, [strikerId, t.id], striker.radius)) continue;
      if (!pathClear(target.position, aimAt, req.bodies, [strikerId, t.id], target.radius)) continue;
      for (const power of POWERS) {
        if (sims >= SIM_BUDGET) break;
        sims++;
        const controls: ControlState = { aim: g.aim, power, spinX: 0, spinY: 0 };
        const res = simulate(game, table, req.bodies, controls, true);
        if (potted(res, t.id, strikerId).ok) clean.push({ controls, target: t, pocket: pocket.id });
      }
    }
  }

  // Keep the best few per (target, pocket): the gentlest powers first, since softer pots leave the cue ball nearer.
  const seen = new Map<string, number>();
  const shortlist = clean.filter((c) => {
    const key = `${c.target.id}/${c.pocket}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n <= 2;
  });

  let best: Suggestion | null = null;
  for (const c of shortlist.slice(0, 40)) {
    if (sims + req.skill.samples > SIM_BUDGET * 2) break;
    let hits = 0;
    let scratches = 0;
    for (let i = 0; i < req.skill.samples; i++) {
      sims++;
      const res = simulate(game, table, req.bodies, perturb(c.controls, req.skill, rng), true);
      const r = potted(res, c.target.id, strikerId);
      if (r.ok) hits++;
      if (r.whiteFirst) scratches++;
    }
    const p = hits / req.skill.samples;
    const ev = p * c.target.value - (scratches / req.skill.samples) * foul;
    if (!best || ev > best.expectedValue || (ev === best.expectedValue && p > best.probability)) {
      best = {
        controls: c.controls,
        kind: "pot",
        target: c.target.id,
        pocket: c.pocket,
        probability: p,
        expectedValue: ev,
        note: `Pot the ${c.target.id} in the ${c.pocket} pocket (about ${Math.round(p * 100)}% for this skill).`,
      };
    }
  }
  if (best && best.probability >= 0.25) return best;

  // No reliable pot: prefer a safety, and only fall back to a poor pot if no safe shot exists.
  return bestSafety(game, table, req, striker, rng) ?? best;
}

/**
 * Safety: hit any ball that is on, gently and without potting anything, and leave it as far from the pockets as
 * possible. Chosen by simulation, so cushions and blocking balls are accounted for; aims fan out around each of the
 * nearest targets so a safe line can be found even when the direct one is blocked.
 */
function bestSafety(game: Game, table: Table, req: AdviceRequest, striker: Body, rng: () => number): Suggestion | null {
  const strikerId = game.input.strikerId;
  const legal = new Set(req.targets.map((t) => t.id));
  const nearest = req.targets
    .map((t) => req.bodies.find((b) => b.id === t.id && b.state !== "pocketed"))
    .filter((b): b is Body => !!b)
    .sort((a, b) => dist(a.position, striker.position) - dist(b.position, striker.position))
    .slice(0, 5);

  const found: { best: { s: Suggestion; score: number } | null } = { best: null };
  const samples = Math.max(3, Math.floor(req.skill.samples / 2));

  const consider = (controls: ControlState) => {
    let clean = 0;
    let farthest = 0;
    let hitId: string | null = null;
    for (let i = 0; i < samples; i++) {
      const res = simulate(game, table, req.bodies, i === 0 ? controls : perturb(controls, req.skill, rng));
      const hit = res.events.find((e) => e.type === "collision" && (e.a === strikerId || e.b === strikerId));
      const firstHit = hit && hit.type === "collision" ? (hit.a === strikerId ? hit.b : hit.a) : null;
      if (!firstHit || !legal.has(firstHit) || res.events.some((e) => e.type === "pocket")) continue;
      clean++;
      hitId ??= firstHit;
      const final = res.final.find((b) => b.id === firstHit)!;
      farthest += Math.min(...table.pockets.map((p) => dist(final.position, pocketAimPoint(p))));
    }
    if (clean === 0 || !hitId) return;
    const p = clean / samples;
    const score = p * 10 + farthest / clean;
    if (!found.best || score > found.best.score) {
      found.best = {
        score,
        s: {
          controls,
          kind: "safety",
          target: hitId,
          pocket: null,
          probability: p,
          expectedValue: 0,
          note: `No reliable pot. Play safe: tap the ${hitId} gently and leave it far from the pockets.`,
        },
      };
    }
  };

  for (const target of nearest) {
    const base = Math.atan2(target.position.y - striker.position.y, target.position.x - striker.position.x);
    for (const da of [-0.12, -0.06, -0.03, 0, 0.03, 0.06, 0.12]) {
      for (const power of SAFETY_POWERS) consider({ aim: base + da, power, spinX: 0, spinY: 0 });
    }
  }
  // Nothing found by aiming at a ball (e.g. another ball blocks every direct line, as in the opening break-off):
  // scan the whole circle, which finds shots that come off a cushion first.
  if (!found.best) {
    for (let deg = 0; deg < 360; deg += 10) {
      for (const power of [0.4, 0.65]) consider({ aim: (deg * Math.PI) / 180, power, spinX: 0, spinY: 0 });
    }
  }
  return found.best?.s ?? null;
}
