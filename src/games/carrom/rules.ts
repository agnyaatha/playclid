import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { Body, ShotResult, Table } from "@/core/types";
import { isBlack, isWhite, QUEEN, STRIKER, strikerStart } from "./layout";

/** Simplified carrom: Player 1 plays the white coins, Player 2 the black. The first to clear their colour wins. */
export interface CarromState {
  current: 0 | 1;
  /** Points: 1 per own coin, 3 for a covered queen. */
  scores: [number, number];
  /** Own coins each player has pocketed. */
  coins: [number, number];
  /** The player who has pocketed the queen but not yet covered her with one of their own coins. */
  queenPending: 0 | 1 | null;
  over: boolean;
  winner: 0 | 1 | null;
}

export const newFrame = (): CarromState => ({
  current: 0,
  scores: [0, 0],
  coins: [0, 0],
  queenPending: null,
  over: false,
  winner: null,
});

const colourOf = (p: 0 | 1) => (p === 0 ? isWhite : isBlack);
const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
const player = (p: 0 | 1) => `Player ${p + 1}`;
const TOTAL = 9;

export interface CarromOutcome {
  state: CarromState;
  foul: boolean;
  points: number;
  /** Coins to put back on the board centre (foul penalty, or an uncovered queen). */
  respot: string[];
  message: string;
}

/** Judge a shot from the list of pocketed ids, in order (striker included). */
export function judgeShot(prev: CarromState, potted: string[]): CarromOutcome {
  const s: CarromState = { ...prev, scores: [...prev.scores] as [number, number], coins: [...prev.coins] as [number, number] };
  const me = s.current;
  const opp = other(me);
  const mine = colourOf(me);
  const theirs = colourOf(opp);
  const respot: string[] = [];
  const strikerPotted = potted.includes(STRIKER);
  const ownPotted = potted.filter(mine);
  const oppPotted = potted.filter(theirs);
  const queenPotted = potted.includes(QUEEN);

  if (strikerPotted) {
    // Foul: coins pocketed this shot come back, and one of the shooter's earlier coins is returned as a penalty.
    respot.push(...ownPotted, ...oppPotted);
    if (queenPotted) respot.push(QUEEN);
    const penalty = s.coins[me] > 0 && ownPotted.length === 0 ? 1 : 0;
    s.coins[me] -= penalty;
    s.scores[me] -= penalty;
    if (s.queenPending === me) {
      respot.push(QUEEN);
      s.queenPending = null;
    }
    s.current = opp;
    return { state: s, foul: true, points: 0, respot, message: `Foul: the striker was potted. ${player(opp)} plays.` };
  }

  let points = 0;
  if (ownPotted.length) {
    s.coins[me] += ownPotted.length;
    points += ownPotted.length;
  }
  s.coins[opp] += oppPotted.length;
  s.scores[opp] += oppPotted.length;
  if (queenPotted) s.queenPending = me;
  // The queen counts only once she is covered by an own coin, in this shot or the next.
  const covered = s.queenPending === me && ownPotted.length > 0;
  if (covered) {
    points += 3;
    s.queenPending = null;
  }
  s.scores[me] += points;

  const done = (p: 0 | 1) => s.coins[p] >= TOTAL;
  if (done(me) || done(opp)) {
    s.over = true;
    s.winner = done(me) ? me : opp;
    return { state: s, foul: false, points, respot, message: `${player(s.winner)} has cleared their coins and wins.` };
  }

  if (ownPotted.length > 0) {
    return { state: s, foul: false, points, respot, message: `${ownPotted.length} coin${ownPotted.length === 1 ? "" : "s"} pocketed${covered ? ", queen covered (+3)" : ""}. ${player(me)} shoots again.` };
  }
  // No own coin: the turn passes, and an uncovered queen goes back on the board.
  if (s.queenPending === me && !queenPotted) {
    respot.push(QUEEN);
    s.queenPending = null;
  } else if (queenPotted) {
    // Queen pocketed this shot with no cover yet: the player keeps the turn to cover her.
    return { state: s, foul: false, points, respot, message: `Queen pocketed. ${player(me)} must now pocket one of their own coins to cover her.` };
  }
  s.current = opp;
  return { state: s, foul: false, points, respot, message: "No coin of your colour pocketed. Turn passes." };
}

/** Put coins back at the centre of the board, nearest free spot first. */
function applyRespots(table: Table, final: Body[], ids: string[]): Body[] {
  let bodies = final.map((b) => ({ ...b }));
  const cx = table.width / 2;
  const cy = table.length / 2;
  for (const id of ids) {
    const coin = bodies.find((b) => b.id === id);
    if (!coin) continue;
    let placed = { x: cx, y: cy };
    for (let r = 0; r < 0.2; r += 0.004) {
      const free = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }))
        .find((p) => !bodies.some((o) => o.id !== id && o.state !== "pocketed" && Math.hypot(o.position.x - p.x, o.position.y - p.y) < o.radius + coin.radius + 1e-6));
      if (free) {
        placed = free;
        break;
      }
    }
    bodies = bodies.map((b) =>
      b.id === id ? { ...b, position: { x: placed.x, y: placed.y, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, state: "stationary" as const } : b,
    );
  }
  return bodies;
}

export const carromRules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result: ShotResult, ctx): Judgement {
    const potted = result.events.flatMap((e) => (e.type === "pocket" ? [e.body] : []));
    const outcome = judgeShot(state as CarromState, potted);
    let bodies = applyRespots(ctx.table, result.final, outcome.respot);
    // The striker always returns to the shooter's baseline for the next turn.
    bodies = bodies.map((b) => (b.id === STRIKER ? strikerStart(ctx.table) : b));
    return { state: outcome.state, bodies, message: outcome.message, foul: outcome.foul, points: outcome.points };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as CarromState;
    return {
      players: [
        { label: "Player 1 (white)", score: s.scores[0] },
        { label: "Player 2 (black)", score: s.scores[1] },
      ],
      current: s.current,
      breakPoints: 0,
      on: s.queenPending === s.current ? "Cover the queen" : s.current === 0 ? "White coins" : "Black coins",
      over: s.over,
      result: s.over && s.winner !== null ? `${player(s.winner)} wins ${Math.max(...s.scores)}–${Math.min(...s.scores)}` : undefined,
    };
  },
  targets(state, bodies) {
    const s = state as CarromState;
    const mine = colourOf(s.current);
    const live = bodies.filter((b) => b.state !== "pocketed" && b.id !== STRIKER);
    const coins = live.filter((b) => mine(b.id)).map((b) => ({ id: b.id, value: 1 }));
    const queen = live.some((b) => b.id === QUEEN) && s.queenPending === null ? [{ id: QUEEN, value: 3 }] : [];
    return [...coins, ...queen];
  },
};
