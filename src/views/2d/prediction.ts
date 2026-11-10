import type { Game } from "@/core/game";
import { scaleCloth, type SimParams } from "@/core/sim/params";
import { stateAt } from "@/core/sim/playback";
import type { Body, ShotInput, SimEvent, Table } from "@/core/types";

export interface Point {
  x: number;
  y: number;
}

/** Optional behaviour of the aiming guides, chosen in the settings. */
export interface GuideOptions {
  /** Label the cut angle and the angles in and out of each cushion. */
  angles: boolean;
  /** Carry each guide on round cushions and corners; off stops it at the first cushion. */
  cushions: boolean;
  /** How much further than the shot really goes to draw the guides: 1 is the true distance. */
  reach: number;
}

export const DEFAULT_GUIDES: GuideOptions = { angles: true, cushions: true, reach: 1 };
export const REACH_MAX = 4;
/** Lessons measure the player, so they never get the optional extras. */
export const PLAIN_GUIDES: GuideOptions = { angles: false, cushions: true, reach: 1 };

/** A labelled measurement drawn on the table, in table coordinates so every view shows the same thing. */
export interface AngleMark {
  /** The guide this belongs to, so it hides along with that guide. */
  line: "aim" | "after";
  lines: Point[][];
  label: string;
  labelAt: Point;
}

export interface Prediction {
  /** Path of the struck ball up to its first ball contact (or until it stops), including cushion bounces. */
  path: Point[];
  /** Cue-ball centre at first contact: where the ghost ball sits. */
  ghost: Point | null;
  hitId: string | null;
  /** Where the ball that was hit goes, up to its next ball contact, a pocket or rest. */
  hitPath: Point[] | null;
  /** Where the struck ball goes after contact, on the same terms. */
  cuePath: Point[] | null;
  marks: AngleMark[];
}

const SAMPLES = 40;
/** Plenty for two balls' paths; a pack that keeps scattering must not stall the aim preview. */
const MAX_EVENTS = 400;
const MAX_BOUNCE_MARKS = 4;
const EPS = 1e-6;

const unit = (v: Point): Point | null => {
  const l = Math.hypot(v.x, v.y);
  return l < 1e-6 ? null : { x: v.x / l, y: v.y / l };
};
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const along = (p: Point, d: Point, k: number): Point => ({ x: p.x + d.x * k, y: p.y + d.y * k });
const between = (a: Point, b: Point) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;

/** An arc at `at` sweeping the short way from direction `a` to direction `b`, with its label beyond the arc. */
function angleMark(line: AngleMark["line"], at: Point, a: Point, b: Point, r: number, label: string, extra: Point[][] = []): AngleMark {
  const from = Math.atan2(a.y, a.x);
  let sweep = Math.atan2(b.y, b.x) - from;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const steps = 14;
  const arc = Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + (sweep * i) / steps;
    return along(at, { x: Math.cos(t), y: Math.sin(t) }, r);
  });
  const mid = from + sweep / 2;
  return { line, lines: [arc, ...extra], label, labelAt: along(at, { x: Math.cos(mid), y: Math.sin(mid) }, r * 1.75) };
}

/**
 * Predict a shot by running the real engine on a scratch copy of the table, so the guides bend round cushions and
 * jaws exactly as the ball will. Reach lowers the cloth friction for the trace: the shape of a ball's path does not
 * depend on friction, only how far along it the ball gets, so the same line simply carries on.
 */
export function predictShot(game: Game, table: Table, bodies: Body[], shot: ShotInput, params?: SimParams, guides: GuideOptions = DEFAULT_GUIDES): Prediction {
  const real = params ?? game.params;
  const sim = guides.reach > 1 ? scaleCloth(real, 1 / guides.reach) : real;
  const id = shot.bodyId;

  // Run past the first contact until both balls that matter have finished their lines.
  const live = new Set<string>();
  let touched = false;
  const stopWhen = (e: SimEvent) => {
    if (e.type === "transition") return false;
    if (!touched) {
      if (e.type === "collision") {
        touched = true;
        live.add(e.a).add(e.b);
        return false;
      }
      return e.type === "pocket" || (e.type === "cushion" && !guides.cushions);
    }
    if (e.type === "collision") {
      live.delete(e.a);
      live.delete(e.b);
    } else if (e.type === "pocket" || !guides.cushions) {
      live.delete(e.body);
    }
    return live.size === 0;
  };
  const res = game.simulate(table, bodies, shot, { params: sim, stopWhen, maxEvents: MAX_EVENTS });
  const { events } = res;
  const indexOf = (bodyId: string) => res.initial.findIndex((b) => b.id === bodyId);
  const bodyAt = (bodyId: string, t: number) => stateAt(res, t, sim.cloth)[indexOf(bodyId)];

  /** One ball's line from just after event `from` to its next ball contact, a pocket, or rest. */
  const trace = (bodyId: string, from: number) => {
    const start = from < 0 ? 0 : events[from].t;
    let end = res.duration;
    let pocket: Point | undefined;
    const bounces: Array<Extract<SimEvent, { type: "cushion" }>> = [];
    for (let i = from + 1; i < events.length; i++) {
      const e = events[i];
      if (e.type === "collision" && (e.a === bodyId || e.b === bodyId)) {
        end = e.t;
        break;
      }
      if (e.type === "pocket" && e.body === bodyId) {
        end = e.t;
        pocket = table.pockets.find((p) => p.id === e.pocket)?.position;
        break;
      }
      if (e.type === "cushion" && e.body === bodyId) {
        if (!guides.cushions) {
          end = e.t;
          break;
        }
        bounces.push(e);
      }
    }
    const times = new Set<number>([start, end, ...bounces.map((b) => b.t)]);
    for (let i = 1; i < SAMPLES; i++) times.add(start + ((end - start) * i) / SAMPLES);
    const idx = indexOf(bodyId);
    const points: Point[] = [];
    const add = (p: Point) => {
      const last = points[points.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-5) points.push({ x: p.x, y: p.y });
    };
    for (const t of [...times].sort((a, b) => a - b)) add(stateAt(res, t, sim.cloth)[idx].position);
    // A potted ball is cut off at the mouth; carry its line on into the pocket.
    if (pocket) add(pocket);
    return { points, bounces };
  };

  const r = 0.09 * Math.min(1, table.width / 1.2);
  const marks: AngleMark[] = [];

  /** Angles in and out of each cushion, measured from the perpendicular. */
  const markBounces = (line: AngleMark["line"], bodyId: string, bounces: ReturnType<typeof trace>["bounces"]) => {
    if (!guides.angles) return;
    for (const e of bounces.slice(0, MAX_BOUNCE_MARKS)) {
      const c = table.cushions.find((x) => x.id === e.cushion);
      const before = unit(bodyAt(bodyId, e.t - EPS).velocity);
      const after = unit(bodyAt(bodyId, e.t + EPS).velocity);
      const face = c && unit({ x: -(c.b.y - c.a.y), y: c.b.x - c.a.x });
      // Jaw tips have no flat face to measure from.
      if (!before || !after || !face) continue;
      const normal = dot(face, before) > 0 ? { x: -face.x, y: -face.y } : face;
      const back = { x: -before.x, y: -before.y };
      const at = bodyAt(bodyId, e.t).position;
      const label = `${Math.round(between(back, normal))}° → ${Math.round(between(normal, after))}°`;
      const arcs = [angleMark(line, at, back, normal, r, label), angleMark(line, at, normal, after, r, label)].flatMap((m) => m.lines);
      marks.push({ line, lines: [...arcs, [at, along(at, normal, r * 1.3)]], label, labelAt: along(at, normal, r * 1.9) });
    }
  };

  /** With extra reach, show where the real shot would actually have stopped. */
  const markStop = () => {
    if (guides.reach <= 1) return;
    const actual = game.simulate(table, bodies, shot, { params: real, stopWhen: (e) => e.type === "collision", maxEvents: MAX_EVENTS });
    const striker = actual.final[indexOf(id)];
    if (actual.events.some((e) => e.type === "collision") || striker.state === "pocketed") return;
    const ring = Array.from({ length: 21 }, (_, i) => along(striker.position, { x: Math.cos((i * Math.PI) / 10), y: Math.sin((i * Math.PI) / 10) }, r * 0.4));
    marks.push({ line: "aim", lines: [ring], label: "Stops", labelAt: along(striker.position, { x: 1, y: 0 }, r * 1.1) });
  };

  const contact = events.findIndex((e) => e.type === "collision");
  const approach = trace(id, -1);
  markBounces("aim", id, approach.bounces);
  markStop();

  const hit = contact >= 0 ? events[contact] : null;
  if (!hit || hit.type !== "collision") return { path: approach.points, ghost: null, hitId: null, hitPath: null, cuePath: null, marks: separateLabels(marks, r, table) };

  const hitId = hit.a === id ? hit.b : hit.a;
  const after = res.keyframes[contact];
  const cue = after.find((b) => b.id === id)!;
  const other = after.find((b) => b.id === hitId)!;
  const ghost = { x: cue.position.x, y: cue.position.y };

  const hitLine = trace(hitId, contact);
  const cueLine = trace(id, contact);
  markBounces("after", hitId, hitLine.bounces);
  markBounces("after", id, cueLine.bounces);

  const incoming = unit(bodyAt(id, hit.t - EPS).velocity);
  const centres = unit({ x: other.position.x - ghost.x, y: other.position.y - ghost.y });
  // Discs are flicked, not cued, so a cut angle says little there.
  if (guides.angles && incoming && centres && game.input.tipOffset) {
    // The cut: the line of centres against the line the cue ball arrived on. 0 is a full-ball hit.
    marks.push(angleMark("aim", ghost, incoming, centres, r, `Cut ${between(incoming, centres).toFixed(1)}°`, [[ghost, along(ghost, incoming, r * 1.3)]]));
  }

  const line = (points: Point[]) => (points.length > 1 ? points : null);
  return { path: approach.points, ghost, hitId, hitPath: line(hitLine.points), cuePath: line(cueLine.points), marks: separateLabels(marks, r, table) };
}

/** Slide readouts towards the middle of the table until none sits on another. `r` is the size of an angle arc. */
export function separateLabels(marks: AngleMark[], r: number, table: Table): AngleMark[] {
  const placed: Point[] = [];
  const clash = (p: Point) => placed.some((q) => Math.abs(q.y - p.y) < r * 2.4 && Math.abs(q.x - p.x) < r * 0.75);
  return marks.map((m) => {
    const inward = m.labelAt.x < table.width / 2 ? 1 : -1;
    let at = m.labelAt;
    for (let i = 0; i < 10 && clash(at); i++) at = { x: at.x + inward * r * 0.8, y: at.y };
    placed.push(at);
    return { ...m, labelAt: at };
  });
}

/** The marks that belong to guides currently switched on. */
export const visibleMarks = (p: Prediction | null, aids: { aimLine: boolean; prediction: boolean }) =>
  (p?.marks ?? []).filter((m) => (m.line === "aim" ? aids.aimLine : aids.prediction));
