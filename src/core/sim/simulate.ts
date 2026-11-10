import type { Body, CushionSegment, MotionState, ShotResult, SimEvent, Table, Vec3 } from "../types";
import { resolveBallBall, resolveCushion } from "./collisions";
import { applyTransition, evolve, reclassify, timeToTransition } from "./motion";
import type { SimParams } from "./params";
import { addPoly, firstApproach, squareQuadratic, type Poly } from "./poly";

export interface SimOptions {
  /** Stop after this many simulated seconds. */
  maxTime?: number;
  /** Safety cap against pathological event cascades. */
  maxEvents?: number;
  /** Stop right after the first event this returns true for (used for cheap shot prediction). */
  stopWhen?: (event: SimEvent) => boolean;
  /** Replace the game's physics parameters for this run (used for the table-speed calibration). */
  params?: SimParams;
}

/** The next cushion, jaw-tip or pocket event for one ball. */
type RailEvent =
  | { kind: "pocket"; at: number; pocket: string }
  | { kind: "cushion"; at: number; cushion: CushionSegment; normal: Vec3 }
  | { kind: "knuckle"; at: number; point: Vec3 };

/** Tie-break order for simultaneous events (deterministic). */
const PRIORITY = { pocket: 0, collision: 1, knuckle: 2, cushion: 2, transition: 3 } as const;

/** Constant acceleration of a ball in its current motion state. */
function acceleration(b: Body, p: SimParams): { x: number; y: number } {
  if (b.state === "sliding") {
    const ux = b.velocity.x - b.radius * b.angularVelocity.y;
    const uy = b.velocity.y + b.radius * b.angularVelocity.x;
    const m = Math.hypot(ux, uy);
    if (m < 1e-12) return { x: 0, y: 0 };
    const a = p.cloth.muSliding * p.cloth.g;
    return { x: (-a * ux) / m, y: (-a * uy) / m };
  }
  if (b.state === "rolling") {
    const s = Math.hypot(b.velocity.x, b.velocity.y);
    if (s < 1e-12) return { x: 0, y: 0 };
    const a = p.cloth.muRolling * p.cloth.g;
    return { x: (-a * b.velocity.x) / s, y: (-a * b.velocity.y) / s };
  }
  return { x: 0, y: 0 };
}

/** Position of a ball along one axis as a quadratic in time: [x0, v, a/2]. */
const axis = (x0: number, v: number, a: number): [number, number, number] => [x0, v, 0.5 * a];

/** Unit normal of the line a-b, pointing towards the middle of the table. */
function inwardNormal(a: Vec3, b: Vec3, table: Table): Vec3 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  let n = { x: -dy / l, y: dx / l, z: 0 };
  const toCentre = { x: table.width / 2 - (a.x + b.x) / 2, y: table.length / 2 - (a.y + b.y) / 2 };
  if (n.x * toCentre.x + n.y * toCentre.y < 0) n = { x: -n.x, y: -n.y, z: 0 };
  return n;
}

/** Position of a ball `dt` seconds ahead under its constant acceleration. */
const at = (x0: number, v: number, a: number, dt: number) => x0 + v * dt + 0.5 * a * dt * dt;

/** True if the ball's position at dt, projected onto the line a-b, lies within the segment. */
function withinSegment(b: Body, acc: { x: number; y: number }, dt: number, a: Vec3, c: Vec3): boolean {
  const px = at(b.position.x, b.velocity.x, acc.x, dt);
  const py = at(b.position.y, b.velocity.y, acc.y, dt);
  const dx = c.x - a.x;
  const dy = c.y - a.y;
  const s = ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy);
  return s >= 0 && s <= 1;
}

/**
 * Event-based simulation: between events every ball follows a closed-form quadratic path, so the next collision,
 * cushion hit, pocket drop or state change is found exactly, then the loop jumps straight to it.
 *
 * Predicted event times are absolute and cached. An event only changes the path of the one or two balls involved, so
 * only their predictions are recomputed: O(n) root solves per event instead of O(n^2).
 *
 * Bodies must already carry a correct motion state (use `reclassify`). Inputs are not mutated.
 */
export function simulateEvents(table: Table, initial: Body[], defaults: SimParams, opts: SimOptions = {}): ShotResult {
  const params = opts.params ?? defaults;
  const maxTime = opts.maxTime ?? 120;
  const maxEvents = opts.maxEvents ?? 30000;
  let bodies = initial.map((b) => ({ ...b }));
  const n = bodies.length;
  const normals = table.cushions.map((c) => inwardNormal(c.a, c.b, table));
  const mouthNormals = table.pockets.map((p) => (p.mouth ? inwardNormal(p.mouth.a, p.mouth.b, table) : null));
  const knuckles = table.knuckles ?? [];
  const events: SimEvent[] = [];
  const keyframes: Body[][] = [];
  let t = 0;

  const transAt = new Float64Array(n).fill(Infinity);
  const transTo: MotionState[] = bodies.map((b) => b.state);
  const accs: { x: number; y: number }[] = bodies.map(() => ({ x: 0, y: 0 }));
  const rail: (RailEvent | null)[] = bodies.map(() => null);
  const pairAt = new Float64Array(n * n).fill(Infinity);

  const refreshMotion = (i: number) => {
    const b = bodies[i];
    accs[i] = acceleration(b, params);
    if (b.state === "pocketed") {
      transAt[i] = Infinity;
      return;
    }
    const tr = timeToTransition(b, params.cloth);
    transAt[i] = tr.dt === Infinity ? Infinity : t + tr.dt;
    transTo[i] = tr.to;
  };

  const refreshRail = (i: number) => {
    const b = bodies[i];
    rail[i] = null;
    if (b.state === "pocketed" || b.state === "stationary" || b.state === "spinning") return;
    const T = Math.min(transAt[i], maxTime) - t;
    const acc = accs[i];
    let best: RailEvent | null = null;
    const offer = (e: RailEvent) => {
      if (!best || e.at < best.at - 1e-12 || (e.at < best.at + 1e-12 && PRIORITY[e.kind] < PRIORITY[best.kind])) best = e;
    };
    const line = (a: Vec3, nrm: Vec3, offset: number): Poly => [
      (b.position.x - a.x) * nrm.x + (b.position.y - a.y) * nrm.y - offset,
      b.velocity.x * nrm.x + b.velocity.y * nrm.y,
      0.5 * (acc.x * nrm.x + acc.y * nrm.y),
    ];
    const circle = (cx: number, cy: number, r: number): Poly =>
      addPoly(
        squareQuadratic(axis(b.position.x - cx, b.velocity.x, acc.x)),
        addPoly(squareQuadratic(axis(b.position.y - cy, b.velocity.y, acc.y)), [-(r * r)]),
      );

    table.pockets.forEach((pk, k) => {
      if (pk.mouth) {
        // Potted as the ball's centre crosses the jaw mouth from the table side.
        const dt = firstApproach(line(pk.mouth.a, mouthNormals[k]!, 0), T);
        if (dt !== null && withinSegment(b, acc, dt, pk.mouth.a, pk.mouth.b)) offer({ kind: "pocket", at: t + dt, pocket: pk.id });
        return;
      }
      const dt = firstApproach(circle(pk.position.x, pk.position.y, pk.radius), T);
      if (dt !== null) offer({ kind: "pocket", at: t + dt, pocket: pk.id });
    });
    table.cushions.forEach((c, k) => {
      const dt = firstApproach(line(c.a, normals[k], b.radius), T);
      if (dt !== null && withinSegment(b, acc, dt, c.a, c.b)) offer({ kind: "cushion", at: t + dt, cushion: c, normal: normals[k] });
    });
    for (const kn of knuckles) {
      const dt = firstApproach(circle(kn.x, kn.y, b.radius), T);
      if (dt !== null) offer({ kind: "knuckle", at: t + dt, point: kn });
    }
    rail[i] = best;
  };

  const refreshPair = (i: number, j: number) => {
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    pairAt[lo * n + hi] = Infinity;
    const a = bodies[lo];
    const b = bodies[hi];
    if (a.state === "pocketed" || b.state === "pocketed") return;
    if (a.state === "stationary" && b.state === "stationary") return;
    const T = Math.min(transAt[lo], transAt[hi], maxTime) - t;
    const reachSum = a.radius + b.radius;
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dvx = a.velocity.x - b.velocity.x;
    const dvy = a.velocity.y - b.velocity.y;
    const dax = accs[lo].x - accs[hi].x;
    const day = accs[lo].y - accs[hi].y;
    // Exact prune: if the gap exceeds the most the pair can close in this window, they cannot meet.
    if (Math.hypot(dx, dy) - reachSum > Math.hypot(dvx, dvy) * T + 0.5 * Math.hypot(dax, day) * T * T + 1e-9) return;
    const f = addPoly(squareQuadratic([dx, dvx, 0.5 * dax]), addPoly(squareQuadratic([dy, dvy, 0.5 * day]), [-(reachSum * reachSum)]));
    const dt = firstApproach(f, T);
    if (dt !== null) pairAt[lo * n + hi] = t + dt;
  };

  const refresh = (changed: number[]) => {
    for (const i of changed) refreshMotion(i);
    for (const i of changed) refreshRail(i);
    for (const i of changed) for (let j = 0; j < n; j++) if (j !== i) refreshPair(i, j);
  };
  refresh(bodies.map((_, i) => i));

  type Kind = "transition" | "rail" | "collision";
  let finishedNaturally = false;
  while (events.length < maxEvents && t < maxTime) {
    // Earliest cached event, with ties broken by kind and then by index so the result is deterministic.
    let bestAt = Infinity;
    let bestPrio = 9;
    let i = -1;
    let j = -1;
    let kind: Kind | null = null;
    const consider = (at: number, prio: number, k: Kind, a: number, b: number) => {
      if (at < bestAt - 1e-12 || (at < bestAt + 1e-12 && prio < bestPrio)) {
        bestAt = at;
        bestPrio = prio;
        i = a;
        j = b;
        kind = k;
      }
    };
    for (let a = 0; a < n; a++) {
      if (transAt[a] !== Infinity) consider(transAt[a], PRIORITY.transition, "transition", a, -1);
      const r = rail[a];
      if (r) consider(r.at, PRIORITY[r.kind], "rail", a, -1);
      for (let b = a + 1; b < n; b++) if (pairAt[a * n + b] !== Infinity) consider(pairAt[a * n + b], PRIORITY.collision, "collision", a, b);
    }
    if (kind === null) {
      finishedNaturally = true;
      break;
    }
    if (bestAt > maxTime) break;

    const dt = Math.max(0, bestAt - t);
    const chosen: Kind = kind;
    const fromState = bodies[i].state;
    const target = i;
    bodies = bodies.map((b, k) => (chosen === "transition" && k === target ? applyTransition(b, dt, params.cloth) : evolve(b, dt, params.cloth)));
    t = Math.max(t, bestAt);

    if (chosen === "transition") {
      bodies[i] = reclassify(bodies[i]);
      events.push({ type: "transition", t, body: bodies[i].id, from: fromState, to: transTo[i] });
      refresh([i]);
    } else if (chosen === "collision") {
      const [a, b] = resolveBallBall(bodies[i], bodies[j], params);
      bodies[i] = a;
      bodies[j] = b;
      events.push({ type: "collision", t, a: a.id, b: b.id });
      refresh([i, j]);
    } else {
      const r = rail[i]!;
      const b = bodies[i];
      if (r.kind === "pocket") {
        bodies[i] = { ...b, state: "pocketed", velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } };
        events.push({ type: "pocket", t, body: b.id, pocket: r.pocket });
      } else if (r.kind === "knuckle") {
        const dx = b.position.x - r.point.x;
        const dy = b.position.y - r.point.y;
        const d = Math.hypot(dx, dy);
        bodies[i] = resolveCushion(b, { x: dx / d, y: dy / d, z: 0 }, params);
        events.push({ type: "cushion", t, body: b.id, cushion: "knuckle" });
      } else {
        bodies[i] = resolveCushion(b, r.normal, params);
        events.push({ type: "cushion", t, body: b.id, cushion: r.cushion.id });
      }
      refresh([i]);
    }
    keyframes.push(bodies);
    if (opts.stopWhen?.(events[events.length - 1])) {
      finishedNaturally = true;
      break;
    }
  }

  // A run cut off by a cap must still hand back a position the next shot can start from.
  const final = finishedNaturally
    ? bodies
    : bodies.map((b) => (b.state === "pocketed" ? b : { ...b, state: "stationary" as const, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } }));
  return { initial: initial.map((b) => ({ ...b })), events, keyframes, duration: t, final };
}
