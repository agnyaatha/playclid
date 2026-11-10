import { scanCannon } from "@/core/lessons/cannon";
import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { Body, ShotResult, Table } from "@/core/types";
import { colourSpots, whiteInD } from "@/games/snooker/layout";
import { atRest, swapCueBalls } from "../shared";
import { clearOfBalls } from "@/core/lessons/challenges";

/** First to this many points. A full match runs far longer; this keeps a game to one sitting. */
export const TARGET = 50;
const NO_CONTACT_PENALTY = 2;

export interface BilliardsState {
  current: 0 | 1;
  scores: [number, number];
  breakPoints: number;
  over: boolean;
  winner: 0 | 1 | null;
}

export const newFrame = (): BilliardsState => ({ current: 0, scores: [0, 0], breakPoints: 0, over: false, winner: null });

const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
const player = (p: 0 | 1) => `Player ${p + 1}`;

export interface BilliardsReport {
  hit: string[];
  cannon: boolean;
  potted: string[];
}

export function reportShot(result: ShotResult): BilliardsReport {
  const { hit, made } = scanCannon(result, "white");
  return { hit, cannon: made, potted: result.events.flatMap((e) => (e.type === "pocket" ? [e.body] : [])) };
}

/** Points for a shot: a cannon scores 2, a winning hazard (pot) and a losing hazard (in-off) 3 off the red, 2 off the other white. */
export function scoreShot(r: BilliardsReport): { points: number; parts: string[] } {
  let points = 0;
  const parts: string[] = [];
  if (r.cannon) {
    points += 2;
    parts.push("cannon");
  }
  if (r.potted.includes("red")) {
    points += 3;
    parts.push("red potted");
  }
  if (r.potted.includes("yellow")) {
    points += 2;
    parts.push("opponent's ball potted");
  }
  if (r.potted.includes("white") && r.hit.length > 0) {
    points += r.hit[0] === "red" ? 3 : 2;
    parts.push("in-off");
  }
  return { points, parts };
}

export interface BilliardsOutcome {
  state: BilliardsState;
  foul: boolean;
  points: number;
  turnPassed: boolean;
  message: string;
}

export function judgeShot(prev: BilliardsState, r: BilliardsReport): BilliardsOutcome {
  const s: BilliardsState = { ...prev, scores: [...prev.scores] as [number, number] };
  const me = s.current;
  const opp = other(me);
  const passTurn = (message: string, foul: boolean, points = 0): BilliardsOutcome => {
    s.current = opp;
    s.breakPoints = 0;
    return { state: s, foul, points, turnPassed: true, message };
  };
  const finish = (who: 0 | 1, message: string, foul: boolean, points: number) => {
    s.over = true;
    s.winner = who;
    return { state: s, foul, points, turnPassed: false, message };
  };

  if (r.hit.length === 0) {
    s.scores[opp] += NO_CONTACT_PENALTY;
    const message = `Foul: the cue ball hit nothing. ${NO_CONTACT_PENALTY} to ${player(opp)}.`;
    return s.scores[opp] >= TARGET ? finish(opp, message, true, 0) : passTurn(message, true);
  }
  const { points, parts } = scoreShot(r);
  if (points === 0) return passTurn("No score. Turn passes.", false);
  s.scores[me] += points;
  s.breakPoints += points;
  const message = `${parts[0][0].toUpperCase()}${parts.join(", ").slice(1)}: +${points}.`;
  if (s.scores[me] >= TARGET) return finish(me, `${message} ${player(me)} wins.`, false, points);
  return { state: s, foul: false, points, turnPassed: false, message };
}

const live = (b: Body) => b.state !== "pocketed";

/** Put potted balls back: the red on the billiards spot, the other white in the middle, the striker in the D. */
function respot(table: Table, final: Body[]): Body[] {
  const spots = colourSpots(table);
  const put = (bodies: Body[], id: string, x: number, y: number) => clearOfBalls(bodies.map((b) => (b.id === id ? atRest({ ...b, position: { x, y, z: 0 } }) : b)), id, table);
  let bodies = final;
  if (!live(bodies.find((b) => b.id === "red")!)) bodies = put(bodies, "red", spots.black.x, spots.black.y);
  if (!live(bodies.find((b) => b.id === "yellow")!)) bodies = put(bodies, "yellow", spots.blue.x, spots.blue.y);
  if (!live(bodies.find((b) => b.id === "white")!)) {
    const d = whiteInD(table).position;
    bodies = put(bodies, "white", d.x, d.y);
  }
  return bodies;
}

export const billiardsRules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result: ShotResult, ctx): Judgement {
    const outcome = judgeShot(state as BilliardsState, reportShot(result));
    const bodies = respot(ctx.table, result.final);
    return { state: outcome.state, bodies: outcome.turnPassed ? swapCueBalls(bodies) : bodies, message: outcome.message, foul: outcome.foul, points: outcome.points };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as BilliardsState;
    return {
      players: [
        { label: "Player 1", score: s.scores[0] },
        { label: "Player 2", score: s.scores[1] },
      ],
      current: s.current,
      breakPoints: s.breakPoints,
      on: `First to ${TARGET}`,
      over: s.over,
      result: s.over && s.winner !== null ? `${player(s.winner)} wins ${Math.max(...s.scores)}–${Math.min(...s.scores)}` : undefined,
    };
  },
  targets: (_state, bodies) => bodies.filter((b) => live(b) && b.id !== "white").map((b) => ({ id: b.id, value: b.id === "red" ? 3 : 2 })),
};
