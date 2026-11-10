import type { ControlState, Game } from "../game";
import { pocketAimPoint } from "../table";
import type { Body, ShotInput, ShotResult, Table } from "../types";
import { withParams } from "../ai/advisor";
import type { SimParams } from "../sim/params";
import { buildLessonBodies, evaluateShot } from "./logic";
import type { DrillLesson } from "./schema";

export interface Solution {
  /** The controls that make the shot, for the UI to apply. */
  controls: ControlState;
  shot: ShotInput;
  result: ShotResult;
  /** How many candidate shots were tried before one succeeded. */
  tried: number;
}

/**
 * Brute-force search for a shot that passes the drill: aim at the ghost ball behind the target (towards the first
 * allowed pocket), then vary aim slightly, power and tip height. Used to prove lessons are achievable and,
 * later, to power a "show me" hint.
 */
export interface PotFound {
  controls: ControlState;
  ball: string;
}

/** A shot that pots one of `targets` from this exact position, trying them in order. */
export function findPot(game: Game, table: Table, bodies: Body[], targets: string[], params?: SimParams): PotFound | null {
  const layout = bodies.filter((b) => b.state !== "pocketed").map((b) => ({ id: b.id, x: b.position.x, y: b.position.y }));
  for (const ball of targets.filter((id) => layout.some((b) => b.id === id))) {
    const lesson = { id: "position", layout, success: { pot: { ball } } } as DrillLesson;
    const found = findSolution(game, table, lesson, params);
    if (found) return { controls: found.controls, ball };
  }
  return null;
}

/**
 * For shots with no ball to line up on a pocket (a cannon, a draw to a zone, the striker into a hole): sweep the aim
 * and pace. A goal with a place to reach only needs a narrow fan around the line to it.
 */
function sweepSolution(game: Game, table: Table, lesson: DrillLesson, bodies: Body[]): Solution | null {
  const striker = bodies.find((b) => b.id === game.input.strikerId)!;
  const { zone, pot } = lesson.success;
  const pocket = pot && (pot.pockets ? table.pockets.find((p) => p.id === pot.pockets![0]) : table.pockets[0]);
  const goal = zone ?? pocket?.position;
  const rad = (d: number) => (d * Math.PI) / 180;
  const aims = goal
    ? Array.from({ length: 41 }, (_, i) => Math.atan2(goal.y - striker.position.y, goal.x - striker.position.x) + rad(((i % 2 ? 1 : -1) * Math.ceil(i / 2)) / 4))
    : Array.from({ length: 720 }, (_, i) => rad(i / 2));
  const powers = goal ? Array.from({ length: 96 }, (_, i) => 0.05 + (i * 0.95) / 95) : [0.3, 0.45, 0.6, 0.8, 0.95];
  const tips = game.input.tipOffset && !goal ? [0, 0.25, -0.25] : [0];
  let tried = 0;
  for (const aim of aims) {
    for (const power of powers) {
      for (const tip of tips) {
        tried++;
        const controls: ControlState = { aim, power, spinX: 0, spinY: tip };
        const shot = game.input.buildShot(controls);
        const result = game.simulate(table, bodies, shot);
        if (evaluateShot(lesson, result, game.input.strikerId).success) return { controls, shot, result, tried };
      }
    }
  }
  return null;
}

export function findSolution(baseGame: Game, table: Table, lesson: DrillLesson, params?: SimParams): Solution | null {
  const game = withParams(baseGame, params);
  const pot = lesson.success.pot;
  const bodies = buildLessonBodies(game, table, lesson);
  if (!pot || pot.ball === game.input.strikerId) return sweepSolution(game, table, lesson, bodies);
  const striker = bodies.find((b) => b.id === game.input.strikerId)!;
  const target = bodies.find((b) => b.id === pot.ball)!;
  const pocketIds = pot.pockets ?? table.pockets.map((p) => p.id);

  const powers = [0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9];
  const tips = game.input.tipOffset ? [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4] : [0];
  const aimOffsets = [0, -0.5, 0.5, -1, 1, -2, 2].map((d) => (d * Math.PI) / 180);
  let tried = 0;

  for (const pid of pocketIds) {
    const pocket = table.pockets.find((p) => p.id === pid)!;
    const aimAt = pocketAimPoint(pocket);
    const ux = aimAt.x - target.position.x;
    const uy = aimAt.y - target.position.y;
    const ul = Math.hypot(ux, uy);
    const ghost = {
      x: target.position.x - (ux / ul) * 2 * target.radius,
      y: target.position.y - (uy / ul) * 2 * target.radius,
    };
    const baseAim = Math.atan2(ghost.y - striker.position.y, ghost.x - striker.position.x);
    for (const da of aimOffsets) {
      for (const power of powers) {
        for (const tip of tips) {
          tried++;
          const controls: ControlState = { aim: baseAim + da, power, spinX: 0, spinY: tip };
          const shot = game.input.buildShot(controls);
          const result = game.simulate(table, bodies, shot);
          if (evaluateShot(lesson, result, game.input.strikerId).success) return { controls, shot, result, tried };
        }
      }
    }
  }
  return null;
}
