import type { ControlState, Game } from "../game";
import { pocketAimPoint } from "../table";
import type { ShotInput, ShotResult, Table } from "../types";
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
export function findSolution(baseGame: Game, table: Table, lesson: DrillLesson, params?: SimParams): Solution | null {
  const game = withParams(baseGame, params);
  const pot = lesson.success.pot;
  if (!pot) return null;
  const bodies = buildLessonBodies(game, table, lesson);
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
