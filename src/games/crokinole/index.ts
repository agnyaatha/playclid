import type { ControlState, Game } from "@/core/game";
import { scanCannon } from "@/core/lessons/cannon";
import type { AidName, Lesson } from "@/core/lessons/schema";
import type { Judgement, RulesEngine, RulesState, Scoreboard } from "@/core/rules";
import type { SimParams } from "@/core/sim/params";
import type { Body, CushionSegment, ShotResult, Table, Vec3 } from "@/core/types";
import { toScreen } from "@/views/2d/geometry";
import type { GameTheme } from "@/views/2d/theme";
import { flickSimulate, retireStriker } from "../shared";

/** Ring radii in metres. Past `play` a disc has dropped into the ditch and is out. */
export const CROK = { play: 0.3, ditch: 0.335, band: 0.02, ten: 0.2, fifteen: 0.1, shoot: 0.285, radius: 0.0159, mass: 0.0065, hole: 0.0178 };
const SIDES = 72;
const PEGS = 8;
const CENTRE = CROK.ditch + CROK.band + 0.002;
export const STRIKER = "striker";
/** Discs per player: a short game of one round. */
export const DISCS = 6;
const MAX_SPEED = 3;
const HOLE_MAX_SPEED = 0.8;
/** How far round the shooting line the placement control reaches, in radians. */
const ARC = 1;

const PARAMS: SimParams = {
  cloth: { muSliding: 0.12, muRolling: 0.12, muSpinning: 0.05, g: 9.81 },
  ballBall: { restitution: 0.9, friction: 0.03 },
  cushion: { restitution: 0.45, friction: 0.1, contactHeight: 1, model: "impulse" },
};

const v = (x: number, y: number): Vec3 => ({ x, y, z: 0 });

/** The round wall of the ditch is many short cushions, and the pegs are points a disc bounces off. */
function createTable(): Table {
  const size = 2 * CENTRE;
  const point = (k: number) => v(CENTRE + Math.cos((k * 2 * Math.PI) / SIDES) * CROK.ditch, CENTRE + Math.sin((k * 2 * Math.PI) / SIDES) * CROK.ditch);
  const mitre = CROK.band * Math.tan(Math.PI / SIDES);
  const cushions: CushionSegment[] = Array.from({ length: SIDES }, (_, k) => ({ id: `wall${k}`, a: point(k), b: point(k + 1), mitre }));
  const knuckles = Array.from({ length: PEGS }, (_, k) => {
    const t = ((k + 0.5) * 2 * Math.PI) / PEGS;
    return v(CENTRE + Math.cos(t) * CROK.fifteen, CENTRE + Math.sin(t) * CROK.fifteen);
  });
  // A disc has to arrive near the middle of the hole and slowly enough to drop; a fast one skims over.
  return { width: size, length: size, pockets: [{ id: "hole", position: v(CENTRE, CENTRE), radius: CROK.hole * 0.65, drawRadius: CROK.hole * 1.2, maxSpeed: HOLE_MAX_SPEED }], cushions, knuckles };
}

const makeDisc = (id: string, x: number, y: number): Body => ({
  id,
  radius: CROK.radius,
  mass: CROK.mass,
  state: "stationary",
  position: { x, y, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
});

const onLine = (k: number) => ({ x: CENTRE + Math.sin(k * ARC) * CROK.shoot, y: CENTRE - Math.cos(k * ARC) * CROK.shoot });
const spawn = () => {
  const p = onLine(0);
  return makeDisc(STRIKER, p.x, p.y);
};

const live = (b: Body) => b.state !== "pocketed";
const radiusOf = (b: Body) => Math.hypot(b.position.x - CENTRE, b.position.y - CENTRE);

/** Points for a disc this far from the centre. */
export function ringValue(r: number): number {
  if (r > CROK.play) return 0;
  if (r <= CROK.fifteen) return 15;
  return r <= CROK.ten ? 10 : 5;
}

const dropInDitch = (bodies: Body[]) => bodies.map((b) => (live(b) && radiusOf(b) > CROK.play ? { ...b, state: "pocketed" as const } : b));

export interface CrokState {
  current: 0 | 1;
  played: [number, number];
  /** Points already banked from discs in the 20 hole. */
  holes: [number, number];
  scores: [number, number];
  over: boolean;
  winner: 0 | 1 | null;
}

export const newFrame = (): CrokState => ({ current: 0, played: [0, 0], holes: [0, 0], scores: [0, 0], over: false, winner: null });
const player = (p: 0 | 1) => `Player ${p + 1}`;
const prefix = (p: 0 | 1) => (p === 0 ? "a" : "b");
const HOLE_POINTS = 20;

export function judgeShot(prev: CrokState, result: ShotResult): { state: CrokState; bodies: Body[]; message: string } {
  const s: CrokState = { ...prev, played: [...prev.played] as [number, number], holes: [...prev.holes] as [number, number], scores: [...prev.scores] as [number, number] };
  const me = s.current;
  const opp: 0 | 1 = me === 0 ? 1 : 0;
  const id = `${prefix(me)}${s.played[me] + 1}`;

  // With an opponent's disc on the board, you must hit one or your own shot comes off.
  const targets = result.initial.filter((b) => live(b) && b.id.startsWith(prefix(opp)));
  const touched = scanCannon(result, STRIKER).hit;
  const missed = targets.length > 0 && !touched.some((t) => t.startsWith(prefix(opp)));

  const holed = result.events.flatMap((e) => (e.type === "pocket" ? [e.body] : []));
  let twenties = 0;
  for (const h of holed) {
    const owner: 0 | 1 = h === STRIKER ? me : h.startsWith("a") ? 0 : 1;
    if (owner === me && h === STRIKER && missed) continue;
    s.holes[owner] += HOLE_POINTS;
    if (owner === me) twenties++;
  }

  let bodies = dropInDitch(retireStriker(result.final, STRIKER, id));
  if (missed) bodies = bodies.map((b) => (b.id === id ? { ...b, state: "pocketed" as const } : b));

  const total = (p: 0 | 1) => s.holes[p] + bodies.filter((b) => live(b) && b.id.startsWith(prefix(p))).reduce((n, b) => n + ringValue(radiusOf(b)), 0);
  s.scores = [total(0), total(1)];
  s.played[me] += 1;
  s.current = opp;

  let message = missed ? "You must hit an opponent's disc: that one comes off." : twenties ? `In the hole: +${HOLE_POINTS * twenties}.` : `${player(opp)} to play.`;
  if (s.played[0] >= DISCS && s.played[1] >= DISCS) {
    s.over = true;
    s.winner = s.scores[0] === s.scores[1] ? null : s.scores[0] > s.scores[1] ? 0 : 1;
    message = s.winner === null ? "All square." : `${player(s.winner)} wins.`;
  }
  return { state: s, bodies: [...bodies, spawn()], message };
}

const rules: RulesEngine = {
  newFrame: () => newFrame(),
  judge(state: RulesState, result: ShotResult): Judgement {
    const o = judgeShot(state as CrokState, result);
    return { state: o.state, bodies: o.bodies, message: o.message, foul: false, points: 0 };
  },
  scoreboard(state: RulesState): Scoreboard {
    const s = state as CrokState;
    return {
      players: [
        { label: "Player 1 (light)", score: s.scores[0] },
        { label: "Player 2 (dark)", score: s.scores[1] },
      ],
      current: s.current,
      breakPoints: 0,
      on: `Disc ${Math.min(DISCS, s.played[s.current] + 1)} of ${DISCS}`,
      over: s.over,
      result: s.over ? (s.winner === null ? "All square" : `${player(s.winner)} wins ${Math.max(...s.scores)}–${Math.min(...s.scores)}`) : undefined,
    };
  },
};

function practiceAfterShot(result: ShotResult) {
  const discs = result.final.filter((b) => b.id !== STRIKER);
  const next = Math.max(0, ...discs.map((b) => Number(b.id.slice(1)))) + 1;
  const kept = dropInDitch(retireStriker(result.final, STRIKER, `a${next}`)).filter(live).slice(-DISCS * 2);
  return { bodies: [...kept, spawn()] };
}

export const crokinole: Game = {
  id: "crokinole",
  name: "Crokinole",
  params: PARAMS,
  rules,
  noPotting: true,
  input: {
    strikerId: STRIKER,
    defaultAim: Math.PI / 2,
    maxSpeed: MAX_SPEED,
    placement: { label: "Disc position on the shooting line", min: -1, max: 1 },
    tipOffset: null,
    buildShot: (c: ControlState) => ({ bodyId: STRIKER, params: { aim: c.aim, speed: c.power * MAX_SPEED, placement: c.spinX } }),
  },
  createTable,
  createInitialBodies: () => [spawn()],
  createBody: makeDisc,
  /** Slide the disc round the shooting line, unless another disc is resting where it would go. */
  place(bodies, controls) {
    const p = onLine(controls.spinX);
    const blocked = bodies.some((o) => o.id !== STRIKER && live(o) && Math.hypot(o.position.x - p.x, o.position.y - p.y) < 2 * CROK.radius);
    return blocked ? bodies : bodies.map((b) => (b.id === STRIKER ? { ...b, position: { x: p.x, y: p.y, z: 0 } } : b));
  },
  afterShot: practiceAfterShot,
  simulate: flickSimulate(PARAMS),
};

export const crokinoleTheme: GameTheme = {
  surface: { cloth: "#deb887", clothShade: "#bd935f", cushion: "#6a3f1e", rail: "#4c2c14", railDark: "#27150a", trim: "#d4a94e" },
  frame: 0.05,
  band: CROK.band,
  opening: "#4c2c14",
  shape: "disc",
  ballColour: (id) => (id === STRIKER ? "#d9a441" : id.startsWith("b") ? "#2b2622" : "#f0dfba"),
  /** The rings, the ring of pegs, the ditch around the board, and a square frame outside it. */
  drawMarkings(ctx, vp, table) {
    const c = toScreen(vp, { x: CENTRE, y: CENTRE });
    const s = vp.scale;
    const a = toScreen(vp, { x: 0, y: 0 });
    const b = toScreen(vp, { x: table.width, y: table.length });
    ctx.fillStyle = "#4c2c14";
    ctx.beginPath();
    ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.arc(c.x, c.y, CROK.ditch * s, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.fillStyle = "#170d07";
    ctx.beginPath();
    ctx.arc(c.x, c.y, CROK.ditch * s, 0, Math.PI * 2);
    ctx.arc(c.x, c.y, CROK.play * s, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(52,26,12,0.8)";
    ctx.lineWidth = 1.4;
    for (const r of [CROK.shoot, CROK.ten, CROK.fifteen]) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#3a2312";
    for (const p of table.knuckles ?? []) {
      const q = toScreen(vp, p);
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.max(2.5, 0.005 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  decorateBall(ctx, cx, cy, r, id) {
    ctx.strokeStyle = id.startsWith("b") ? "rgba(255,255,255,0.3)" : "rgba(60,30,12,0.4)";
    ctx.lineWidth = Math.max(0.6, r * 0.08);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  },
};

const common: { kind: "drill"; gameId: "crokinole"; aids: AidName[]; practiceAttempts: number; testAttempts: number; module: string; moduleTitle: string } = {
  kind: "drill",
  gameId: "crokinole",
  aids: ["aimLine", "ghostBall"],
  practiceAttempts: 6,
  testAttempts: 4,
  module: "1",
  moduleTitle: "Flicks and pegs",
};
const start = { id: STRIKER, ...onLine(0) };

export const crokinoleLessons: Lesson[] = [
  { ...common, id: "k1-the-twenty", order: 1, title: "The 20 hole", goal: "Flick your disc straight up the board and into the hole in the centre.", layout: [start], success: { pot: { ball: STRIKER, pockets: ["hole"] } }, stars: [3, 5, 7], tips: ["Too hard and it skips over the hole, so aim for a medium, even flick."] },
  { ...common, id: "k1-draw-to-fifteen", order: 2, title: "Draw to the 15 ring", goal: "Stop your disc inside the ring of pegs, for 15 points.", layout: [start], success: { zone: { x: CENTRE, y: CENTRE, radius: CROK.fifteen - CROK.radius } }, stars: [4, 6, 8], tips: ["The pegs guard this ring. Pick the gap first, then the weight."] },
  { ...common, id: "k1-knock-it-in", order: 3, title: "Knock it in", goal: "Hit the dark disc so it drops into the hole.", layout: [start, { id: "b1", x: CENTRE, y: CENTRE - 0.09 }], success: { pot: { ball: "b1", pockets: ["hole"] } }, stars: [3, 5, 7], tips: ["A straight, full hit passes your speed into the other disc."] },
  { ...common, id: "k1-hit-and-stay", order: 4, title: "Hit and stay", goal: "Strike the dark disc and keep your own in the circle near where it was.", layout: [start, { id: "b1", x: CENTRE, y: CENTRE - 0.16 }], success: { zone: { x: CENTRE, y: CENTRE - 0.16, radius: 0.07 } }, stars: [3, 5, 7], tips: ["The rule is that you must hit an opponent's disc when one is on the board, so this is the shot you will play most."] },
];
