import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { Body, ShotResult, Table } from "@/core/types";
import { headSpot, footSpot, WHITE } from "@/games/pool/layout";
import { reportShot, type ShotReport } from "@/games/pool/rules";
import { POOL } from "@/games/pool/table";
import { atRest } from "../shared";

export const NINE = "ball9";

/** Rotation: the lowest ball on the table must be hit first, and whoever legally pots the 9 wins. */
export interface NineState {
  current: 0 | 1;
  potted: [number, number];
  /** Number of the lowest ball still on the table. */
  on: number;
  ballInHand: boolean;
  over: boolean;
  winner: 0 | 1 | null;
}

export const newFrame = (): NineState => ({ current: 0, potted: [0, 0], on: 1, ballInHand: false, over: false, winner: null });

const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
const player = (p: 0 | 1) => `Player ${p + 1}`;
const numberOf = (id: string) => Number(id.replace("ball", ""));

export interface NineOutcome {
  state: NineState;
  foul: boolean;
  /** The 9 went down on a foul and goes back on its spot. */
  respotNine: boolean;
  made: number;
  message: string;
}

/** Judge a shot, given the lowest numbered ball that was on the table before it. */
export function judgeShot(prev: NineState, report: ShotReport): NineOutcome {
  const s: NineState = { ...prev, potted: [...prev.potted] as [number, number], ballInHand: false };
  const me = s.current;
  const opp = other(me);
  const balls = report.potted.filter((id) => id !== WHITE);
  const reasons: string[] = [];

  if (!report.firstContact) reasons.push("The cue ball hit no ball.");
  else if (numberOf(report.firstContact) !== prev.on) reasons.push(`The first ball hit must be the ${prev.on}-ball.`);
  if (report.potted.includes(WHITE)) reasons.push("The cue ball was potted.");
  if (report.firstContact && reasons.length === 0 && balls.length === 0 && !report.cushionAfterContact) reasons.push("No ball reached a cushion after contact.");
  const foul = reasons.length > 0;
  const nineDown = balls.includes(NINE);

  if (foul) {
    s.current = opp;
    s.ballInHand = true;
    return { state: s, foul: true, respotNine: nineDown, made: 0, message: `Foul: ${reasons.join(" ")} ${player(opp)} has the cue ball in hand.` };
  }
  s.potted[me] += balls.length;
  if (nineDown) {
    s.over = true;
    s.winner = me;
    return { state: s, foul: false, respotNine: false, made: balls.length, message: `${player(me)} pots the 9 and wins.` };
  }
  if (balls.length > 0) return { state: s, foul: false, respotNine: false, made: balls.length, message: `${balls.length === 1 ? "Ball" : `${balls.length} balls`} down. ${player(me)} plays on.` };
  s.current = opp;
  return { state: s, foul: false, respotNine: false, made: 0, message: "No pot. Turn passes." };
}

const clear = (bodies: Body[], id: string, x: number, y: number) => !bodies.some((b) => b.id !== id && b.state !== "pocketed" && Math.hypot(b.position.x - x, b.position.y - y) < 2 * POOL.ballRadius + 1e-6);

function place(bodies: Body[], id: string, x: number, from: number, step: number): Body[] {
  let y = from;
  while (!clear(bodies, id, x, y) && y > POOL.ballRadius) y += step;
  return bodies.map((b) => (b.id === id ? atRest({ ...b, position: { x, y, z: 0 } }) : b));
}

function applyOutcome(table: Table, final: Body[], outcome: NineOutcome): Body[] {
  let bodies = final;
  const foot = footSpot(table);
  if (outcome.respotNine) bodies = place(bodies, NINE, foot.x, foot.y, -0.01);
  if (outcome.state.ballInHand) {
    const head = headSpot(table);
    bodies = place(bodies, WHITE, head.x, head.y, -0.01);
  }
  return bodies;
}

const lowest = (bodies: Body[]) => Math.min(...bodies.filter((b) => b.id !== WHITE && b.state !== "pocketed").map((b) => numberOf(b.id)));

export const nineRules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result: ShotResult, ctx): Judgement {
    const prev = { ...(state as NineState), on: lowest(result.initial) };
    const outcome = judgeShot(prev, reportShot(result));
    const bodies = applyOutcome(ctx.table, result.final, outcome);
    if (!outcome.state.over) outcome.state.on = lowest(bodies);
    return { state: outcome.state, bodies, message: outcome.message, foul: outcome.foul, points: outcome.made };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as NineState;
    return {
      players: [
        { label: "Player 1", score: s.potted[0] },
        { label: "Player 2", score: s.potted[1] },
      ],
      current: s.current,
      breakPoints: 0,
      on: `${s.on}-ball`,
      over: s.over,
      result: s.over && s.winner !== null ? `${player(s.winner)} wins` : undefined,
    };
  },
  ballInHand: (state) => (state as NineState).ballInHand,
  targets(state, bodies) {
    const id = `ball${(state as NineState).on}`;
    return bodies.some((b) => b.id === id && b.state !== "pocketed") ? [{ id, value: 1 }] : [];
  },
};
