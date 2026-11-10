import type { Game } from "@/core/game";
import { scanCannon } from "@/core/lessons/cannon";
import type { AidName, DrillLesson, Lesson } from "@/core/lessons/schema";
import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { SimParams } from "@/core/sim/params";
import type { Body, Table, Vec3 } from "@/core/types";
import { pool } from "@/games/pool";
import { POOL_PARAMS } from "@/games/pool/params";
import { toScreen } from "@/views/2d/geometry";
import type { GameTheme } from "@/views/2d/theme";
import { swapCueBalls } from "../shared";

export const THREE = { length: 2.84, width: 1.42, ballRadius: 0.03075, ballMass: 0.21, band: 0.05 };
const THREE_PARAMS: SimParams = { ...POOL_PARAMS, cloth: { ...POOL_PARAMS.cloth, muRolling: 0.012 } };
/** First to this many points. */
export const TARGET = 15;
export const CUSHIONS_NEEDED = 3;

const v = (x: number, y: number): Vec3 => ({ x, y, z: 0 });

/** A pocketless match table: four unbroken cushions meeting at the corners. */
export function createThreeCushionTable(): Table {
  const { length: L, width: W, band } = THREE;
  return {
    width: W,
    length: L,
    pockets: [],
    cushions: [
      { id: "bottom", a: v(0, 0), b: v(W, 0), mitre: band },
      { id: "top", a: v(0, L), b: v(W, L), mitre: band },
      { id: "left", a: v(0, 0), b: v(0, L), mitre: band },
      { id: "right", a: v(W, 0), b: v(W, L), mitre: band },
    ],
  };
}

const makeBall = (id: string, x: number, y: number): Body => ({
  id,
  radius: THREE.ballRadius,
  mass: THREE.ballMass,
  state: "stationary",
  position: { x, y, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
});

export interface ThreeState {
  current: 0 | 1;
  scores: [number, number];
  run: number;
  over: boolean;
  winner: 0 | 1 | null;
}

export const newFrame = (): ThreeState => ({ current: 0, scores: [0, 0], run: 0, over: false, winner: null });
const player = (p: 0 | 1) => `Player ${p + 1}`;

/** A point is both other balls hit, with three cushions touched before the second. */
export function judgeScan(prev: ThreeState, scan: { made: boolean; cushions: number }) {
  const s: ThreeState = { ...prev, scores: [...prev.scores] as [number, number] };
  const me = s.current;
  if (scan.made && scan.cushions >= CUSHIONS_NEEDED) {
    s.scores[me] += 1;
    s.run += 1;
    if (s.scores[me] >= TARGET) {
      s.over = true;
      s.winner = me;
      return { state: s, scored: true, message: `${player(me)} wins.` };
    }
    return { state: s, scored: true, message: `Point. ${player(me)} plays on.` };
  }
  s.current = me === 0 ? 1 : 0;
  s.run = 0;
  const why = !scan.made ? "Did not hit both balls." : `Only ${scan.cushions} cushion${scan.cushions === 1 ? "" : "s"} before the second ball.`;
  return { state: s, scored: false, message: `${why} Turn passes.` };
}

const rules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result): Judgement {
    const o = judgeScan(state as ThreeState, scanCannon(result, "white"));
    return { state: o.state, bodies: o.scored ? result.final : swapCueBalls(result.final), message: o.message, foul: false, points: o.scored ? 1 : 0 };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as ThreeState;
    return {
      players: [
        { label: "Player 1", score: s.scores[0] },
        { label: "Player 2", score: s.scores[1] },
      ],
      current: s.current,
      breakPoints: s.run,
      on: `First to ${TARGET}`,
      over: s.over,
      result: s.over && s.winner !== null ? `${player(s.winner)} wins ${Math.max(...s.scores)}–${Math.min(...s.scores)}` : undefined,
    };
  },
};

export const threecushion: Game = {
  ...pool,
  id: "threecushion",
  name: "Three-Cushion",
  params: THREE_PARAMS,
  rules,
  noPotting: true,
  placeStriker: undefined,
  afterShot: undefined,
  createTable: createThreeCushionTable,
  createBody: makeBall,
  createInitialBodies: (table) => [makeBall("white", table.width / 2 + 0.18, table.length * 0.25), makeBall("yellow", table.width / 2, table.length * 0.25), makeBall("red", table.width / 2, table.length * 0.75)],
  spots: undefined,
  simulate: (table, bodies, shot, opts) => pool.simulate(table, bodies, shot, { ...opts, params: opts?.params ?? THREE_PARAMS }),
};

const COLOURS: Record<string, string> = { white: "#f6f4ec", yellow: "#f2cf1d", red: "#c8201e" };

export const threeCushionTheme: GameTheme = {
  surface: { cloth: "#2467a6", clothShade: "#174676", cushion: "#1c5488", rail: "#3a2415", railDark: "#1a0f08", trim: "#e5e2d8" },
  frame: 0.13,
  band: THREE.band,
  shape: "sphere",
  ballColour: (id) => COLOURS[id] ?? "#888",
  /** The three spots, and the diamonds along each rail that players count from when working out a route. */
  drawMarkings(ctx, vp, table) {
    const dot = (x: number, y: number, r: number) => {
      const c = toScreen(vp, { x, y });
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.fillStyle = "rgba(240,233,216,0.55)";
    for (const k of [0.25, 0.5, 0.75]) dot(table.width / 2, table.length * k, 2.2);
    ctx.fillStyle = "rgba(240,233,216,0.35)";
    for (let i = 1; i < 8; i++) for (const x of [0.012, table.width - 0.012]) dot(x, (table.length * i) / 8, 1.8);
    for (let i = 1; i < 4; i++) for (const y of [0.012, table.length - 0.012]) dot((table.width * i) / 4, y, 1.8);
  },
};

const common: { kind: "drill"; gameId: "threecushion"; aids: AidName[]; practiceAttempts: number; testAttempts: number; module: string; moduleTitle: string } = {
  kind: "drill",
  gameId: "threecushion",
  aids: ["aimLine", "ghostBall", "prediction"],
  practiceAttempts: 6,
  testAttempts: 4,
  module: "1",
  moduleTitle: "Building up to three",
};

const lesson = (id: string, order: number, title: string, goal: string, cushions: number, white: number[], red: number[], yellow: number[], stars: [number, number, number], tips: string[]): DrillLesson => ({
  ...common,
  id,
  order,
  title,
  goal,
  layout: [
    { id: "white", x: white[0], y: white[1] },
    { id: "red", x: red[0], y: red[1] },
    { id: "yellow", x: yellow[0], y: yellow[1] },
  ],
  success: { cannon: { cushions } },
  stars,
  tips,
});

export const threeCushionLessons: Lesson[] = [
  lesson("t1-cannon", 1, "A simple cannon", "Hit both other balls, with no cushions needed yet. Get a feel for how your ball leaves the first one.", 0, [0.71, 0.6], [0.6, 1.5], [0.85, 1.5], [4, 6, 8], ["Clip the first ball just enough that yours runs on to the second."]),
  lesson("t1-one-cushion", 2, "One cushion first", "Touch one cushion before reaching the second ball.", 1, [0.4, 0.7], [0.45, 1.3], [1.1, 1.2], [3, 5, 7], ["Pick the cushion first, then work backwards to where to hit the first ball."]),
  lesson("t1-two-cushion", 3, "Two cushions", "Now two cushions before the second ball.", 2, [0.4, 0.6], [0.55, 1.0], [1.15, 2.0], [2, 4, 6], ["Side spin widens or narrows the angle your ball takes off each cushion."]),
  lesson("t1-three-cushion", 4, "The full three", "The real thing: three cushions before the second ball.", 3, [0.35, 0.6], [0.5, 0.95], [1.1, 2.2], [1, 3, 5], ["Plan a route around the corner, where three cushions come quickest.", "Pace matters: it has to get round and still reach the second ball."]),
];
