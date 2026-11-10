import type { ClothParams } from "../sim/motion";
import { stateAt } from "../sim/playback";
import type { ShotResult, Table } from "../types";

/** Break totals worth marking, lowest first. */
export const MILESTONES = [10, 20, 30, 50, 75, 100, 147] as const;

/** The highest milestone passed by going from one break total to another, if any. */
export function milestoneCrossed(before: number, after: number): number | null {
  return [...MILESTONES].reverse().find((m) => before < m && after >= m) ?? null;
}

export const milestoneTitle = (m: number) => (m >= 147 ? "Maximum!" : m >= 100 ? "Century!" : `Break of ${m}`);

/** How a ball is named to the player. */
export function ballName(id: string): string {
  if (/^red/.test(id)) return "red";
  if (/^w\d/.test(id)) return "white coin";
  if (/^b\d/.test(id)) return "black coin";
  const n = /^(?:ball)?(\d+)$/.exec(id);
  return n ? `${n[1]}-ball` : id;
}

function firstContact(result: ShotResult, strikerId: string) {
  const index = result.events.findIndex((e) => e.type === "collision" && (e.a === strikerId || e.b === strikerId));
  const e = result.events[index];
  if (index < 0 || e.type !== "collision") return null;
  const before = index > 0 ? result.keyframes[index - 1] : result.initial;
  const after = result.keyframes[index];
  const hitId = e.a === strikerId ? e.b : e.a;
  return { index, hitId, before, after, t: e.t };
}

/** Every ball potted, in order, leaving out the striker. */
export const pottedBalls = (result: ShotResult, strikerId: string) =>
  result.events.flatMap((e) => (e.type === "pocket" && e.body !== strikerId ? [e.body] : []));

/** A pot from further than this share of the table's length counts as a long pot. */
const LONG_SHARE = 0.4;

/** Distance from the striker's start to the ball it hit first, or null if it hit nothing. */
function contactDistance(result: ShotResult, strikerId: string) {
  const hit = firstContact(result, strikerId);
  if (!hit) return null;
  const s = result.initial.find((b) => b.id === strikerId)!;
  const o = result.initial.find((b) => b.id === hit.hitId)!;
  return Math.hypot(s.position.x - o.position.x, s.position.y - o.position.y);
}

export const isLong = (result: ShotResult, strikerId: string, table: Table) => (contactDistance(result, strikerId) ?? 0) >= Math.max(table.width, table.length) * LONG_SHARE;

/** What one shot added to the session's numbers. */
export interface ShotRecord {
  player: 0 | 1;
  /** The striker reached another ball. */
  contact: boolean;
  /** Balls legally potted. */
  pots: string[];
  long: boolean;
  breakAfter: number;
}

export function recordShot(result: ShotResult, strikerId: string, table: Table, o: { player: 0 | 1; foul: boolean; breakAfter: number }): ShotRecord {
  return {
    player: o.player,
    contact: firstContact(result, strikerId) !== null,
    pots: o.foul ? [] : pottedBalls(result, strikerId),
    long: isLong(result, strikerId, table),
    breakAfter: o.breakAfter,
  };
}

export interface SessionSummary {
  shots: number;
  pots: number;
  /** Share of shots that hit a ball and potted one; null before any such shot. */
  potRate: number | null;
  longRate: number | null;
  highBreak: number;
}

export function summariseSession(log: ShotRecord[], player?: 0 | 1): SessionSummary {
  const mine = player === undefined ? log : log.filter((r) => r.player === player);
  const tried = mine.filter((r) => r.contact);
  const longs = tried.filter((r) => r.long);
  const rate = (rows: ShotRecord[]) => (rows.length ? rows.filter((r) => r.pots.length > 0).length / rows.length : null);
  return {
    shots: mine.length,
    pots: mine.reduce((n, r) => n + r.pots.length, 0),
    potRate: rate(tried),
    longRate: rate(longs),
    highBreak: Math.max(0, ...mine.map((r) => r.breakAfter)),
  };
}

/** The name of a shot worth seeing again: a long pot, or a double off a cushion. */
export function greatShot(result: ShotResult, strikerId: string, table: Table): string | null {
  const hit = firstContact(result, strikerId);
  if (!hit) return null;
  const pot = result.events.findIndex((e) => e.type === "pocket" && e.body === hit.hitId);
  if (pot < 0) return null;
  const doubled = result.events.slice(hit.index + 1, pot).some((e) => e.type === "cushion" && e.body === hit.hitId);
  if (doubled) return "Double!";
  return isLong(result, strikerId, table) ? "Long pot!" : null;
}

const degrees = (r: number) => (r * 180) / Math.PI;
const NEAR_MISS = 0.3;

export interface Verdict {
  text: string;
  tone: "good" | "bad" | "note";
}

/** One plain sentence on how a shot went, measured from the shot itself. */
export function shotVerdict(result: ShotResult, strikerId: string, table: Table, cloth: ClothParams): Verdict {
  const striker = strikerId === "striker" ? "striker" : "cue ball";
  const hit = firstContact(result, strikerId);
  if (!hit) return { text: `The ${striker} touched nothing.`, tone: "bad" };

  const s0 = hit.before.find((b) => b.id === strikerId)!;
  const s = hit.after.find((b) => b.id === strikerId)!;
  const o = hit.after.find((b) => b.id === hit.hitId)!;
  const line = Math.atan2(o.position.y - s.position.y, o.position.x - s.position.x);
  let cut = Math.abs(degrees(line - Math.atan2(s0.velocity.y, s0.velocity.x))) % 360;
  if (cut > 180) cut = 360 - cut;
  const cutText = `${cut.toFixed(0)}° cut`;

  const potted = pottedBalls(result, strikerId);
  if (result.events.some((e) => e.type === "pocket" && e.body === strikerId)) return { text: `${potted.length ? `Potted the ${ballName(potted[0])}, but the` : "The"} ${striker} went in${potted.length ? " too" : ""}.`, tone: "bad" };
  if (potted.length) return { text: `Potted the ${ballName(potted[0])}${potted.length > 1 ? ` and ${potted.length - 1} more` : ""} · ${cutText}`, tone: "good" };

  // No pot: how close did the ball that was hit come to a pocket?
  const index = result.initial.findIndex((b) => b.id === hit.hitId);
  let best = Infinity;
  const samples = 80;
  for (let i = 0; i <= samples; i++) {
    const p = stateAt(result, hit.t + ((result.duration - hit.t) * i) / samples, cloth)[index].position;
    for (const k of table.pockets) best = Math.min(best, Math.hypot(p.x - k.position.x, p.y - k.position.y) - k.radius);
  }
  if (best < NEAR_MISS) return { text: `Missed the pocket by ${Math.max(1, Math.round(best * 100))} cm · ${cutText}`, tone: "note" };
  return { text: `Hit the ${ballName(hit.hitId)} · ${cutText}`, tone: "note" };
}
