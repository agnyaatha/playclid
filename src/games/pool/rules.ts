import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { Body, ShotResult, Table } from "@/core/types";
import { EIGHT, headSpot, isSolid, isStripe, WHITE } from "./layout";
import { POOL } from "./table";

export type Group = "solids" | "stripes";

export interface PoolState {
  current: 0 | 1;
  /** Each player's group once the table is no longer open. */
  groups: [Group | null, Group | null];
  /** Balls each player has legally made from their own group. */
  potted: [number, number];
  over: boolean;
  winner: 0 | 1 | null;
  /** The player at the table may place the cue ball anywhere (we place it on the head spot). */
  ballInHand: boolean;
}

export const newFrame = (): PoolState => ({
  current: 0,
  groups: [null, null],
  potted: [0, 0],
  over: false,
  winner: null,
  ballInHand: false,
});

export interface ShotReport {
  firstContact: string | null;
  /** Every ball potted, in order, including the cue ball. */
  potted: string[];
  /** A ball touched a cushion (or was potted) after the cue ball hit a ball. */
  cushionAfterContact: boolean;
}

export function reportShot(result: ShotResult): ShotReport {
  const idx = result.events.findIndex((e) => e.type === "collision" && (e.a === WHITE || e.b === WHITE));
  const first = idx >= 0 ? result.events[idx] : null;
  const firstContact = first && first.type === "collision" ? (first.a === WHITE ? first.b : first.a) : null;
  const potted = result.events.flatMap((e) => (e.type === "pocket" ? [e.body] : []));
  const after = idx >= 0 ? result.events.slice(idx + 1) : [];
  return { firstContact, potted, cushionAfterContact: after.some((e) => e.type === "cushion" || e.type === "pocket") };
}

export const groupOf = (id: string): Group | null => (isSolid(id) ? "solids" : isStripe(id) ? "stripes" : null);
const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
const player = (p: 0 | 1) => `Player ${p + 1}`;

/** How many balls of each group are on the table. */
export function remaining(bodies: Body[]): Record<Group, number> {
  const live = bodies.filter((b) => b.state !== "pocketed");
  return { solids: live.filter((b) => isSolid(b.id)).length, stripes: live.filter((b) => isStripe(b.id)).length };
}

export interface PoolOutcome {
  state: PoolState;
  foul: boolean;
  /** Balls made legally by the shooter this shot. */
  made: number;
  whiteInHand: boolean;
  message: string;
}

/** Apply 8-ball rules to a finished shot. `left` is the ball count per group on the table before the shot. */
export function judgeShot(prev: PoolState, report: ShotReport, left: Record<Group, number>): PoolOutcome {
  const s: PoolState = { ...prev, groups: [...prev.groups] as PoolState["groups"], potted: [...prev.potted] as [number, number] };
  const me = s.current;
  const opp = other(me);
  const own = s.groups[me];
  const cleared = own !== null && left[own] === 0;
  const balls = report.potted.filter((id) => id !== WHITE);
  const reasons: string[] = [];

  const legalFirst = (id: string) => (id === EIGHT ? cleared : own === null || groupOf(id) === own);
  if (!report.firstContact) reasons.push("The cue ball hit no ball.");
  else if (!legalFirst(report.firstContact)) {
    reasons.push(
      report.firstContact === EIGHT ? "The 8-ball was hit before the group was cleared." : "The first ball hit was not from your group.",
    );
  }
  if (report.potted.includes(WHITE)) reasons.push("The cue ball was potted.");
  if (report.firstContact && reasons.length === 0 && balls.length === 0 && !report.cushionAfterContact) {
    reasons.push("No ball reached a cushion after contact.");
  }
  const foul = reasons.length > 0;

  if (balls.includes(EIGHT)) {
    const wins = !foul && cleared;
    s.over = true;
    s.winner = wins ? me : opp;
    return {
      state: s,
      foul,
      made: 0,
      whiteInHand: false,
      message: wins ? `${player(me)} pots the 8-ball and wins.` : `${player(me)} potted the 8-ball too early${foul ? " with a foul" : ""} and loses.`,
    };
  }

  // The first legal pot on an open table decides the groups.
  if (own === null && !foul) {
    const first = balls.map(groupOf).find((g): g is Group => g !== null);
    if (first) {
      s.groups[me] = first;
      s.groups[opp] = first === "solids" ? "stripes" : "solids";
    }
  }
  let made = 0;
  for (const id of balls) {
    const g = groupOf(id);
    if (g && g === s.groups[me]) {
      s.potted[me] += 1;
      made += 1;
    } else if (g && g === s.groups[opp]) {
      s.potted[opp] += 1;
    }
  }

  if (foul) {
    s.current = opp;
    s.ballInHand = true;
    return { state: s, foul: true, made: 0, whiteInHand: true, message: `Foul: ${reasons.join(" ")} ${player(opp)} has the cue ball in hand.` };
  }
  s.ballInHand = false;
  if (made > 0) {
    return { state: s, foul: false, made, whiteInHand: false, message: `${made === 1 ? "Ball" : `${made} balls`} made. ${player(me)} shoots again.` };
  }
  s.current = opp;
  return { state: s, foul: false, made: 0, whiteInHand: false, message: "No ball made. Turn passes." };
}

function applyOutcome(table: Table, final: Body[], outcome: PoolOutcome): Body[] {
  if (!outcome.whiteInHand) return final;
  const h = headSpot(table);
  let y = h.y;
  const taken = (yy: number) =>
    final.some((b) => b.id !== WHITE && b.state !== "pocketed" && Math.hypot(b.position.x - h.x, b.position.y - yy) < 2 * POOL.ballRadius + 1e-6);
  while (taken(y) && y > POOL.ballRadius) y -= 0.01;
  return final.map((b) =>
    b.id === WHITE
      ? { ...b, position: { x: h.x, y, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, state: "stationary" as const }
      : b,
  );
}

const describeOn = (s: PoolState) => {
  const g = s.groups[s.current];
  return g === null ? "Open table" : g === "solids" ? "Solids" : "Stripes";
};

export const poolRules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result: ShotResult, ctx): Judgement {
    const outcome = judgeShot(state as PoolState, reportShot(result), remaining(result.initial));
    return {
      state: outcome.state,
      bodies: applyOutcome(ctx.table, result.final, outcome),
      message: outcome.message,
      foul: outcome.foul,
      points: outcome.made,
    };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as PoolState;
    return {
      players: [
        { label: "Player 1", score: s.potted[0] },
        { label: "Player 2", score: s.potted[1] },
      ],
      current: s.current,
      breakPoints: 0,
      on: describeOn(s),
      over: s.over,
      result: s.over && s.winner !== null ? `${player(s.winner)} wins` : undefined,
    };
  },
  ballInHand: (state) => (state as PoolState).ballInHand,
  targets(state, bodies) {
    const s = state as PoolState;
    const left = remaining(bodies);
    const own = s.groups[s.current];
    const live = bodies.filter((b) => b.state !== "pocketed" && b.id !== WHITE).map((b) => b.id);
    let ids: string[];
    if (own === null) ids = live.filter((id) => id !== EIGHT);
    else if (left[own] === 0) ids = [EIGHT];
    else ids = live.filter((id) => groupOf(id) === own);
    return ids.filter((id) => live.includes(id)).map((id) => ({ id, value: 1 }));
  },
};
