import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { Body, ShotResult, Table } from "@/core/types";
import { colourSpots, whiteInD } from "./layout";
import { isSnookered } from "./snookered";
import { SNOOKER } from "./table";

export const WHITE = "white";
export const COLOUR_ORDER = ["yellow", "green", "brown", "blue", "pink", "black"] as const;
const VALUES: Record<string, number> = { yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7 };

const isRed = (id: string) => id.startsWith("red");
const isColour = (id: string) => id in VALUES;
export const ballValue = (id: string) => (isRed(id) ? 1 : (VALUES[id] ?? 0));
const nameOf = (id: string) => (isRed(id) ? "red" : id);

/** A foul costs at least this many points, and at most the value of the black. */
const MIN_FOUL = 4;
const MAX_FOUL = 7;

/** What is on for the player at the table: a red, a colour (after a red), or the colours in order. */
export type Phase = "red" | "colour" | "clearance";

export interface FrameState {
  scores: [number, number];
  current: 0 | 1;
  breakPoints: number;
  redsLeft: number;
  phase: Phase;
  /** Index into COLOUR_ORDER of the colour on during the clearance. */
  nextColour: number;
  frameOver: boolean;
  winner: 0 | 1 | null;
  /** Scores were level after the black: it was respotted and the next pot or foul decides the frame. */
  blackDecider: boolean;
  /** The white was potted: the player at the table places it in the D. */
  whiteInHand: boolean;
  /** The incoming player is snookered after a foul: they may nominate any ball as a free ball. */
  freeBall: boolean;
  /** The last shot was a foul where no ball on was hit: the incoming player may ask for it to be replayed. */
  missOffered: boolean;
}

export function newFrame(redsLeft = 15): FrameState {
  return {
    scores: [0, 0],
    current: 0,
    breakPoints: 0,
    redsLeft,
    phase: redsLeft > 0 ? "red" : "clearance",
    nextColour: 0,
    frameOver: false,
    winner: null,
    blackDecider: false,
    whiteInHand: false,
    freeBall: false,
    missOffered: false,
  };
}

/** The facts about a finished shot that the rules care about. */
export interface ShotReport {
  /** First ball the cue ball hit, or null if it hit nothing. */
  firstContact: string | null;
  /** Every ball potted, in order, including the white. */
  potted: string[];
}

export function reportShot(result: ShotResult, strikerId = WHITE): ShotReport {
  const first = result.events.find((e) => e.type === "collision" && (e.a === strikerId || e.b === strikerId));
  const firstContact = first && first.type === "collision" ? (first.a === strikerId ? first.b : first.a) : null;
  const potted = result.events.flatMap((e) => (e.type === "pocket" ? [e.body] : []));
  return { firstContact, potted };
}

/** The colour on right now, when a single colour is on (the clearance). */
export const colourOn = (s: FrameState) => (s.phase === "clearance" ? COLOUR_ORDER[s.nextColour] : null);

function isOn(s: FrameState, id: string, nominated: string | null): boolean {
  if (s.blackDecider) return id === "black";
  if (s.phase === "red") return isRed(id);
  if (s.phase === "colour") return isColour(id) && (nominated ? id === nominated : true);
  return id === COLOUR_ORDER[s.nextColour];
}

/** Value of "the ball on" for penalty purposes: a colour that is not nominated counts as the black. */
function onValue(s: FrameState, nominated: string | null): number {
  if (s.blackDecider) return 7;
  if (s.phase === "red") return 1;
  if (s.phase === "colour") return nominated ? ballValue(nominated) : MAX_FOUL;
  return ballValue(COLOUR_ORDER[s.nextColour]);
}

export interface RulesOutcome {
  state: FrameState;
  foul: boolean;
  /** Points to the shooter (legal) or to the opponent (foul). */
  points: number;
  /** Colours to put back on their spots. */
  respot: string[];
  whiteInHand: boolean;
  /** Balls to put back exactly where they started (a red potted as a free ball). */
  restore?: string[];
  message: string;
}

const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
const player = (p: 0 | 1) => `Player ${p + 1}`;

/**
 * Apply the rules to a finished shot. If no colour is nominated after a red, the colour the cue ball hit first
 * counts as nominated (an unrefereed table cannot ask).
 */
export function judgeShot(prev: FrameState, report: ShotReport, nominated: string | null = null): RulesOutcome {
  const s: FrameState = { ...prev, scores: [...prev.scores] as [number, number], whiteInHand: false, freeBall: false, missOffered: false };
  // With a free ball, the nomination names the free ball and not a colour.
  const free = prev.freeBall ? nominated : null;
  const nomColour = prev.freeBall ? null : nominated;
  nominated = nomColour;
  const { firstContact } = report;
  const whitePotted = report.potted.includes(WHITE);
  const balls = report.potted.filter((id) => id !== WHITE);
  const effective =
    nominated ?? (s.phase === "colour" && firstContact && isColour(firstContact) ? firstContact : null);
  let freePotted = false;

  const reasons: string[] = [];
  const values = [onValue(s, nominated)];
  let legalReds = 0;
  let legalColour: string | null = null;

  if (!firstContact) {
    reasons.push("The cue ball hit no ball.");
  } else if (!isOn(s, firstContact, effective) && firstContact !== free) {
    reasons.push(`The first ball hit was the ${nameOf(firstContact)}, which was not on.`);
    values.push(ballValue(firstContact));
  }
  for (const id of balls) {
    if (free && id === free) {
      freePotted = true;
      continue;
    }
    if (!isOn(s, id, effective)) {
      reasons.push(`The ${nameOf(id)} was potted but was not on.`);
      values.push(ballValue(id));
    } else if (s.phase === "red" && !s.blackDecider) {
      legalReds++;
    } else if (legalColour) {
      reasons.push("More than one colour was potted.");
      values.push(ballValue(id));
    } else {
      legalColour = id;
    }
  }
  if (whitePotted) reasons.push("The cue ball was potted.");

  const foul = reasons.length > 0;
  const redsPotted = balls.filter((id) => isRed(id) && id !== free).length;

  if (foul) {
    const points = Math.min(MAX_FOUL, Math.max(MIN_FOUL, ...values));
    const opp = other(s.current);
    s.scores[opp] += points;
    s.breakPoints = 0;
    s.redsLeft -= redsPotted;
    const respot = balls.filter(isColour);
    const restore = freePotted && free && isRed(free) ? [free] : undefined;
    const message = `Foul: ${points} to ${player(opp)}. ${reasons.join(" ")}`;

    if (s.blackDecider) return finish(s, opp, respot, true, whitePotted, message, points);
    s.current = opp;
    if (s.phase === "clearance" && s.nextColour === COLOUR_ORDER.length - 1) {
      return finish(s, null, respot, true, whitePotted, message, points);
    }
    if (s.phase === "colour") {
      if (s.redsLeft > 0) s.phase = "red";
      else {
        s.phase = "clearance";
        s.nextColour = 0;
      }
    } else if (s.phase === "red" && s.redsLeft <= 0) {
      s.phase = "colour";
    }
    s.whiteInHand = whitePotted;
    // A miss: no ball on was hit (the cue ball hit nothing, or hit a ball that was not on).
    s.missOffered = !s.frameOver && (!firstContact || (!isOn(prev, firstContact, effective) && firstContact !== free));
    return { state: s, foul: true, points, respot, restore, whiteInHand: whitePotted, message };
  }

  // A free ball potted counts as the ball on, but the free ball itself goes back on the table.
  if (freePotted && free) {
    const pts = s.phase === "red" ? 1 : s.phase === "colour" ? ballValue(free) : ballValue(COLOUR_ORDER[s.nextColour]);
    s.scores[s.current] += pts;
    s.breakPoints += pts;
    if (s.phase === "red") s.phase = "colour";
    else if (s.phase === "colour") {
      if (s.redsLeft > 0) s.phase = "red";
      else {
        s.phase = "clearance";
        s.nextColour = 0;
      }
    }
    return {
      state: s,
      foul: false,
      points: pts,
      respot: isColour(free) ? [free] : [],
      restore: isRed(free) ? [free] : undefined,
      whiteInHand: false,
      message: `Free ball potted (+${pts}).`,
    };
  }

  // Legal shot.
  if (s.blackDecider) {
    if (legalColour === "black") return finish(s, s.current, [], false, false, `${player(s.current)} pots the black and wins.`, 7);
    s.current = other(s.current);
    return { state: s, foul: false, points: 0, respot: [], whiteInHand: false, message: "No pot. Black is still on." };
  }

  if (s.phase === "red") {
    if (legalReds > 0) {
      s.scores[s.current] += legalReds;
      s.breakPoints += legalReds;
      s.redsLeft -= legalReds;
      s.phase = "colour";
      return {
        state: s,
        foul: false,
        points: legalReds,
        respot: [],
        whiteInHand: false,
        message: `${legalReds === 1 ? "Red" : `${legalReds} reds`} potted (+${legalReds}). Choose a colour.`,
      };
    }
    return passTurn(s, "No pot.");
  }

  if (s.phase === "colour") {
    if (legalColour) {
      const pts = ballValue(legalColour);
      s.scores[s.current] += pts;
      s.breakPoints += pts;
      if (s.redsLeft > 0) s.phase = "red";
      else {
        s.phase = "clearance";
        s.nextColour = 0;
      }
      return {
        state: s,
        foul: false,
        points: pts,
        respot: [legalColour],
        whiteInHand: false,
        message: `${nameOf(legalColour)} potted (+${pts}). ${s.phase === "red" ? "Red on." : "Colours in order: yellow on."}`,
      };
    }
    if (s.redsLeft > 0) s.phase = "red";
    else {
      s.phase = "clearance";
      s.nextColour = 0;
    }
    return passTurn(s, "No pot.");
  }

  // Clearance.
  if (legalColour) {
    const pts = ballValue(legalColour);
    s.scores[s.current] += pts;
    s.breakPoints += pts;
    s.nextColour += 1;
    if (s.nextColour < COLOUR_ORDER.length) {
      return {
        state: s,
        foul: false,
        points: pts,
        respot: [],
        whiteInHand: false,
        message: `${nameOf(legalColour)} potted (+${pts}). ${COLOUR_ORDER[s.nextColour]} on.`,
      };
    }
    return finish(s, null, [], false, false, `${nameOf(legalColour)} potted (+${pts}).`, pts);
  }
  return passTurn(s, "No pot.");
}

function passTurn(s: FrameState, message: string): RulesOutcome {
  s.current = other(s.current);
  s.breakPoints = 0;
  return { state: s, foul: false, points: 0, respot: [], whiteInHand: false, message };
}

/**
 * End the frame. `decidedBy` names the winner outright (the black decider); null means compare scores, with level
 * scores sending the black back to its spot for a decider.
 */
function finish(
  s: FrameState,
  decidedBy: 0 | 1 | null,
  respot: string[],
  foul: boolean,
  whiteInHand: boolean,
  message: string,
  points: number,
): RulesOutcome {
  if (decidedBy === null && s.scores[0] === s.scores[1]) {
    s.blackDecider = true;
    s.current = other(s.current);
    s.breakPoints = 0;
    return {
      state: s,
      foul,
      points,
      respot: [...new Set([...respot, "black"])],
      whiteInHand,
      message: `${message} Scores are level: the black is respotted and the next pot or foul decides the frame.`,
    };
  }
  s.frameOver = true;
  s.winner = decidedBy ?? (s.scores[0] > s.scores[1] ? 0 : 1);
  return { state: s, foul, points, respot, whiteInHand, message: `${message} Frame over.` };
}

/** Is a spot taken? A ball counts if it overlaps the spot. */
function occupied(bodies: Body[], x: number, y: number, ignore: Set<string>): boolean {
  return bodies.some(
    (b) => b.state !== "pocketed" && !ignore.has(b.id) && Math.hypot(b.position.x - x, b.position.y - y) < 2 * b.radius + 1e-6,
  );
}

/** Find where a colour goes: its own spot, else the highest free spot, else as near as possible up the table. */
export function respotPosition(table: Table, bodies: Body[], id: string, ignore: Set<string>) {
  const spots = colourSpots(table);
  const own = spots[id as keyof typeof spots];
  if (!occupied(bodies, own.x, own.y, ignore)) return { x: own.x, y: own.y };
  for (const name of [...COLOUR_ORDER].reverse()) {
    const s = spots[name];
    if (!occupied(bodies, s.x, s.y, ignore)) return { x: s.x, y: s.y };
  }
  const R = SNOOKER.ballRadius;
  for (let y = own.y; y <= table.length - R; y += 0.001) {
    if (!occupied(bodies, own.x, y, ignore)) return { x: own.x, y };
  }
  return { x: own.x, y: own.y };
}

/** Apply a rules outcome to the bodies: respot colours and replace a potted white in the D. */
export function applyOutcome(table: Table, final: Body[], outcome: RulesOutcome, initial: Body[] = []): Body[] {
  let bodies = final.map((b) => ({ ...b }));
  for (const id of outcome.restore ?? []) {
    const start = initial.find((b) => b.id === id);
    if (start) bodies = bodies.map((b) => (b.id === id ? { ...start, state: "stationary" as const } : b));
  }
  const respot = new Set(outcome.respot);
  const toMove = new Set([...respot, ...(outcome.whiteInHand ? [WHITE] : [])]);
  // Place in value order so the highest colour gets the best spot.
  const order = [...respot].sort((a, b) => ballValue(b) - ballValue(a));
  for (const id of order) {
    const p = respotPosition(table, bodies, id, toMove);
    bodies = bodies.map((b) =>
      b.id === id ? { ...b, position: { x: p.x, y: p.y, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, state: "stationary" } : b,
    );
    toMove.delete(id);
  }
  if (outcome.whiteInHand) {
    const { x, y: startY } = whiteInD(table).position;
    let y = startY;
    // Slide towards the baulk cushion if the middle of the D is taken.
    while (occupied(bodies, x, y, new Set([WHITE])) && y > SNOOKER.ballRadius) y -= 0.01;
    bodies = bodies.map((b) =>
      b.id === WHITE ? { ...b, position: { x, y, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, state: "stationary" } : b,
    );
  }
  return bodies;
}

function describeOn(s: FrameState): string {
  if (s.blackDecider) return "Black (decider)";
  if (s.phase === "red") return "Red";
  if (s.phase === "colour") return "Any colour";
  return `${COLOUR_ORDER[s.nextColour][0].toUpperCase()}${COLOUR_ORDER[s.nextColour].slice(1)}`;
}

/** The balls a player may hit first in this state (a free ball is extra to these). */
function ballsOn(s: FrameState, bodies: Body[]): string[] {
  const live = bodies.filter((b) => b.state !== "pocketed" && b.id !== WHITE).map((b) => b.id);
  if (s.blackDecider) return live.filter((id) => id === "black");
  if (s.phase === "red") return live.filter(isRed);
  if (s.phase === "colour") return live.filter(isColour);
  return live.filter((id) => id === COLOUR_ORDER[s.nextColour]);
}

export const snookerRules: RulesEngine = {
  newFrame: (opts) => newFrame(opts?.redsLeft ?? 15),
  judge(state, result, ctx): Judgement {
    const outcome = judgeShot(state as FrameState, reportShot(result), ctx.nominated ?? null);
    const bodies = applyOutcome(ctx.table, result.final, outcome, result.initial);
    let message = outcome.message;
    // After a foul, a snookered incoming player gets a free ball (unless they are placing the white in hand).
    if (outcome.foul && !outcome.state.frameOver && !outcome.whiteInHand && isSnookered(bodies, ballsOn(outcome.state, bodies))) {
      outcome.state.freeBall = true;
      message += " Snookered: the next player has a free ball.";
    }
    return {
      state: outcome.state,
      bodies,
      message,
      foul: outcome.foul,
      points: outcome.foul ? 0 : outcome.points,
    };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as FrameState;
    return {
      players: [
        { label: "Player 1", score: s.scores[0] },
        { label: "Player 2", score: s.scores[1] },
      ],
      current: s.current,
      breakPoints: s.breakPoints,
      on: s.freeBall ? "Free ball: nominate any ball" : describeOn(s),
      over: s.frameOver,
      result: s.frameOver && s.winner !== null ? `${player(s.winner)} wins ${Math.max(...s.scores)}–${Math.min(...s.scores)}` : undefined,
    };
  },
  targets(state, bodies, nominated) {
    const s = state as FrameState;
    const live = bodies.filter((b) => b.state !== "pocketed" && b.id !== WHITE).map((b) => b.id);
    let ids: string[];
    if (s.blackDecider) ids = ["black"];
    else if (s.phase === "red") ids = live.filter(isRed);
    else if (s.phase === "colour") ids = nominated ? [nominated] : live.filter(isColour);
    else ids = [COLOUR_ORDER[s.nextColour]];
    return ids.filter((id) => live.includes(id)).map((id) => ({ id, value: ballValue(id) }));
  },
  ballInHand: (state) => (state as FrameState).whiteInHand,
  missOffered: (state) => (state as FrameState).missOffered,
  replayAfterMiss(before, after) {
    const b = before as FrameState;
    const a = after as FrameState;
    // The foul penalty stands; the offender plays again from the original position with a fresh visit.
    return { ...b, scores: [...a.scores] as [number, number], breakPoints: 0, freeBall: false, whiteInHand: false, missOffered: false };
  },
  nominations(state, bodies) {
    const s = state as FrameState;
    if (s.freeBall) return bodies.filter((b) => b.state !== "pocketed" && b.id !== WHITE).map((b) => b.id);
    if (s.phase !== "colour" || s.blackDecider) return null;
    return COLOUR_ORDER.filter((c) => bodies.some((b) => b.id === c && b.state !== "pocketed"));
  },
};
