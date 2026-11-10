import type { ControlState, Game } from "@/core/game";
import { clearOfBalls } from "@/core/lessons/challenges";
import type { AidName, Lesson } from "@/core/lessons/schema";
import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { SimParams } from "@/core/sim/params";
import type { Body, ShotResult, Table, Vec3 } from "@/core/types";
import { toScreen } from "@/views/2d/geometry";
import type { GameTheme } from "@/views/2d/theme";
import { flickSimulate, retireStriker } from "../shared";

/** A 12 ft table. Past `play` the board ends: a puck there has gone in the far gutter. */
export const SHUFFLE = { play: 3.66, gutter: 0.05, width: 0.5, radius: 0.029, mass: 0.33, startY: 0.3, band: 0.025 };
const { play: PLAY } = SHUFFLE;
export const STRIKER = "striker";
/** Pucks per player per round. */
export const PUCKS = 4;
export const TARGET = 15;
const RANGE = 0.17;
const MAX_SPEED = 4.2;

/** Waxed wood is slick, so a puck carries a long way; the side boards only give a modest bounce. */
const PARAMS: SimParams = {
  cloth: { muSliding: 0.11, muRolling: 0.11, muSpinning: 0.05, g: 9.81 },
  ballBall: { restitution: 0.85, friction: 0.03 },
  cushion: { restitution: 0.45, friction: 0, contactHeight: 1, model: "impulse" },
};

const v = (x: number, y: number): Vec3 => ({ x, y, z: 0 });

function createTable(): Table {
  const L = PLAY + SHUFFLE.gutter;
  const W = SHUFFLE.width;
  const m = SHUFFLE.band;
  return {
    width: W,
    length: L,
    // The whole far edge is one long pocket: a puck that crosses it has gone over the end and cannot come back.
    pockets: [{ id: "over", position: v(W / 2, L), radius: 0.01, unmarked: true, mouth: { a: v(0, PLAY), b: v(W, PLAY) } }],
    cushions: [
      { id: "near", a: v(0, 0), b: v(W, 0), mitre: m },
      { id: "far", a: v(0, L), b: v(W, L), mitre: m },
      { id: "left", a: v(0, 0), b: v(0, L), mitre: m },
      { id: "right", a: v(W, 0), b: v(W, L), mitre: m },
    ],
  };
}

const makePuck = (id: string, x: number, y: number): Body => ({
  id,
  radius: SHUFFLE.radius,
  mass: SHUFFLE.mass,
  state: "stationary",
  position: { x, y, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
});

const spawn = () => makePuck(STRIKER, SHUFFLE.width / 2, SHUFFLE.startY);
const live = (b: Body) => b.state !== "pocketed";
const isPuck = (b: Body) => b.id !== STRIKER;

/** Points for a puck resting at distance `y` along the table: the closer to the far end, the more. */
export function zoneValue(y: number): number {
  if (y > PLAY) return 0;
  if (y >= PLAY - 0.15) return 3;
  if (y >= PLAY - 0.6) return 2;
  return y >= PLAY - 1.2 ? 1 : 0;
}

/** Only the player with the furthest puck scores, for each of their pucks beyond the opponent's best. */
export function roundPoints(bodies: Body[]): [number, number] {
  const ys = (p: string) => bodies.filter((b) => live(b) && b.id.startsWith(p) && b.position.y <= PLAY).map((b) => b.position.y);
  const a = ys("a");
  const b = ys("b");
  const best = (l: number[]) => (l.length ? Math.max(...l) : -1);
  const total = (mine: number[], theirBest: number) => mine.filter((y) => y > theirBest).reduce((s, y) => s + zoneValue(y), 0);
  return best(a) > best(b) ? [total(a, best(b)), 0] : best(b) > best(a) ? [0, total(b, best(a))] : [0, 0];
}

export interface ShuffleState {
  current: 0 | 1;
  /** Pucks played so far this round. */
  shot: number;
  round: number;
  scores: [number, number];
  over: boolean;
  winner: 0 | 1 | null;
}

export const newFrame = (): ShuffleState => ({ current: 0, shot: 0, round: 1, scores: [0, 0], over: false, winner: null });
const player = (p: 0 | 1) => `Player ${p + 1}`;

export function judgeBodies(prev: ShuffleState, final: Body[], table: Table): { state: ShuffleState; bodies: Body[]; message: string } {
  const s: ShuffleState = { ...prev, scores: [...prev.scores] as [number, number] };
  const id = `${s.current === 0 ? "a" : "b"}${Math.floor(s.shot / 2) + 1}`;
  let bodies = retireStriker(final, STRIKER, id);
  s.shot += 1;
  s.current = s.current === 0 ? 1 : 0;
  let message = `${player(s.current)} to play.`;
  if (s.shot === PUCKS * 2) {
    const [a, b] = roundPoints(bodies);
    s.scores = [s.scores[0] + a, s.scores[1] + b];
    message = a > b ? `Round to ${player(0)}: +${a}.` : b > a ? `Round to ${player(1)}: +${b}.` : "Nobody scored that round.";
    bodies = bodies.filter((x) => !isPuck(x));
    s.shot = 0;
    s.round += 1;
    s.current = 0;
    const top = Math.max(...s.scores);
    if (top >= TARGET && s.scores[0] !== s.scores[1]) {
      s.over = true;
      s.winner = s.scores[0] > s.scores[1] ? 0 : 1;
      message += ` ${player(s.winner)} wins.`;
    }
  }
  return { state: s, bodies: clearOfBalls([...bodies, spawn()], STRIKER, table), message };
}

const rules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result: ShotResult, ctx): Judgement {
    const o = judgeBodies(state as ShuffleState, result.final, ctx.table);
    return { state: o.state, bodies: o.bodies, message: o.message, foul: false, points: 0 };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as ShuffleState;
    return {
      players: [
        { label: "Player 1 (red)", score: s.scores[0] },
        { label: "Player 2 (blue)", score: s.scores[1] },
      ],
      current: s.current,
      breakPoints: 0,
      on: `Round ${s.round} · puck ${Math.floor(s.shot / 2) + 1} of ${PUCKS}`,
      over: s.over,
      result: s.over && s.winner !== null ? `${player(s.winner)} wins ${Math.max(...s.scores)}–${Math.min(...s.scores)}` : undefined,
    };
  },
};

/** Free practice: pucks stay where they land until there are too many, then the oldest goes. */
function practiceAfterShot(result: ShotResult, table: Table) {
  const pucks = result.final.filter(isPuck);
  const next = Math.max(0, ...pucks.map((b) => Number(b.id.slice(1)))) + 1;
  const kept = retireStriker(result.final, STRIKER, `a${next}`).filter(live).slice(-PUCKS * 2);
  return { bodies: clearOfBalls([...kept, spawn()], STRIKER, table) };
}

export const shuffleboard: Game = {
  id: "shuffleboard",
  name: "Shuffleboard",
  params: PARAMS,
  rules,
  noPotting: true,
  input: {
    strikerId: STRIKER,
    defaultAim: Math.PI / 2,
    maxSpeed: MAX_SPEED,
    placement: { label: "Puck position across the table", min: -1, max: 1 },
    tipOffset: null,
    buildShot: (c: ControlState) => ({ bodyId: STRIKER, params: { aim: c.aim, speed: c.power * MAX_SPEED, placement: c.spinX } }),
  },
  createTable,
  createInitialBodies: () => [spawn()],
  createBody: makePuck,
  place(bodies, controls) {
    return bodies.map((b) => {
      if (b.id !== STRIKER) return b;
      const x = Math.min(SHUFFLE.width - SHUFFLE.radius, Math.max(SHUFFLE.radius, b.position.x + controls.spinX * RANGE));
      const blocked = bodies.some((o) => o.id !== STRIKER && live(o) && Math.hypot(o.position.x - x, o.position.y - b.position.y) < 2 * SHUFFLE.radius);
      return blocked ? b : { ...b, position: { ...b.position, x } };
    });
  },
  afterShot: practiceAfterShot,
  simulate: flickSimulate(PARAMS),
};

const COLOURS: Record<string, string> = { a: "#c8342c", b: "#2a62c0" };

export const shuffleboardTheme: GameTheme = {
  surface: { cloth: "#d8b47a", clothShade: "#bb9257", cushion: "#5d3a1c", rail: "#4a2b13", railDark: "#26140a", trim: "#d4a94e" },
  frame: 0.07,
  band: SHUFFLE.band,
  shape: "disc",
  ballColour: (id) => (id === STRIKER ? "#e8dcc0" : (COLOURS[id[0]] ?? "#888")),
  /** The scoring zones at the far end, and the gutter past the end of the board. */
  drawMarkings(ctx, vp, table) {
    const W = table.width;
    const box = (y0: number, y1: number, colour: string) => {
      const a = toScreen(vp, { x: 0, y: y0 });
      const b = toScreen(vp, { x: W, y: y1 });
      ctx.fillStyle = colour;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    };
    box(PLAY, table.length, "#160c06");
    box(PLAY - 0.15, PLAY, "rgba(176,44,36,0.34)");
    box(PLAY - 0.6, PLAY - 0.15, "rgba(36,92,170,0.24)");
    box(PLAY - 1.2, PLAY - 0.6, "rgba(176,44,36,0.16)");
    ctx.strokeStyle = "rgba(52,26,12,0.8)";
    ctx.lineWidth = 1.4;
    for (const y of [PLAY, PLAY - 0.15, PLAY - 0.6, PLAY - 1.2, SHUFFLE.startY + 0.09]) {
      const a = toScreen(vp, { x: 0, y });
      const b = toScreen(vp, { x: W, y });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(52,26,12,0.75)";
    ctx.font = `700 ${Math.max(11, 0.1 * vp.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [y, n] of [
      [PLAY - 0.075, "3"],
      [PLAY - 0.375, "2"],
      [PLAY - 0.9, "1"],
    ] as const) {
      const c = toScreen(vp, { x: W / 2, y });
      ctx.fillText(n, c.x, c.y);
    }
  },
  decorateBall(ctx, cx, cy, r) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(0.6, r * 0.09);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
  },
};

const common: { kind: "drill"; gameId: "shuffleboard"; aids: AidName[]; practiceAttempts: number; testAttempts: number; module: string; moduleTitle: string } = {
  kind: "drill",
  gameId: "shuffleboard",
  aids: ["aimLine"],
  practiceAttempts: 6,
  testAttempts: 4,
  module: "1",
  moduleTitle: "Finding the weight",
};
const W2 = SHUFFLE.width / 2;
const start = { id: STRIKER, x: W2, y: SHUFFLE.startY };

export const shuffleLessons: Lesson[] = [
  { ...common, id: "s1-find-the-two", order: 1, title: "Into the 2 zone", goal: "Slide your puck so it stops in the target circle in the 2 zone. Pace is everything here.", layout: [start], success: { zone: { x: W2, y: PLAY - 0.375, radius: 0.2 } }, stars: [4, 6, 8], tips: ["Start firmer than you think, then take a little off each time."] },
  { ...common, id: "s1-find-the-three", order: 2, title: "Hang it in the 3", goal: "Stop in the narrow 3 zone, right at the far end, without going over.", layout: [start], success: { zone: { x: W2, y: PLAY - 0.075, radius: 0.075 } }, stars: [2, 4, 6], tips: ["A puck hanging just short of the edge is the best shot in the game."] },
  { ...common, id: "s1-round-a-blocker", order: 3, title: "Around a blocker", goal: "A puck sits in the way. Angle yours past it and into the circle behind.", layout: [start, { id: "b1", x: W2, y: PLAY - 1.4 }], success: { zone: { x: W2 - 0.13, y: PLAY - 0.5, radius: 0.1 } }, stars: [3, 5, 7], tips: ["Move your puck across the table first, so a small angle does the work."] },
];
