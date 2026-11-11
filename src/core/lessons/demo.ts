import type { Game } from "../game";
import { pocketAimPoint } from "../table";
import type { Body, ShotInput, Table } from "../types";
import { buildLessonBodies } from "./logic";
import type { Demo, LayoutBall } from "./schema";

export interface BuiltDemo {
  bodies: Body[];
  /** Null for a still picture. */
  shot: ShotInput | null;
  aim: number;
  power: number;
}

/** The aim, in radians, that a demo's shot asks for. */
export function demoAim(game: Game, table: Table, bodies: Body[], demo: Demo): number {
  const shot = demo.shot;
  if (!shot) return game.input.defaultAim;
  const aim = shot.aim;
  if ("deg" in aim) return (aim.deg * Math.PI) / 180;
  const striker = bodies.find((b) => b.id === game.input.strikerId);
  if (!striker) throw new Error(`Demo "${demo.caption}": no ${game.input.strikerId} in the layout`);
  const from = striker.position;
  const towards = (p: { x: number; y: number }) => Math.atan2(p.y - from.y, p.x - from.x);
  if ("toward" in aim) return towards(aim.toward);
  const id = "pot" in aim ? aim.pot : aim.at;
  const ball = bodies.find((b) => b.id === id);
  if (!ball) throw new Error(`Demo "${demo.caption}": no ball "${id}" in the layout`);
  if ("at" in aim) return towards(ball.position);
  const pocket = table.pockets.find((p) => p.id === aim.pocket);
  if (!pocket) throw new Error(`Demo "${demo.caption}": no pocket "${aim.pocket}"`);
  // Ghost ball: touching the object ball on the far side from the pocket.
  const target = pocketAimPoint(pocket);
  const dx = target.x - ball.position.x;
  const dy = target.y - ball.position.y;
  const len = Math.hypot(dx, dy);
  const reach = ball.radius + striker.radius;
  return towards({ x: ball.position.x - (dx / len) * reach, y: ball.position.y - (dy / len) * reach });
}

/** The bodies and the shot a demo describes, ready to simulate. */
export function buildDemo(game: Game, table: Table, demo: Demo): BuiltDemo {
  const bodies = buildLessonBodies(game, table, { layout: demo.layout, id: demo.caption });
  const aim = demoAim(game, table, bodies, demo);
  const power = demo.shot?.power ?? 0.3;
  const shot = demo.shot ? game.input.buildShot({ aim, power, spinX: demo.shot.spin?.x ?? 0, spinY: demo.shot.spin?.y ?? 0 }) : null;
  return { bodies, shot, aim, power };
}

/** A layout that puts balls exactly where these bodies are, e.g. a game's opening position. */
export const layoutOf = (bodies: Body[]): LayoutBall[] => bodies.map((b) => ({ id: b.id, x: b.position.x, y: b.position.y }));
