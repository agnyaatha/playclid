import { reclassify } from "@/core/sim/motion";
import type { SimParams } from "@/core/sim/params";
import { simulateEvents, type SimOptions } from "@/core/sim/simulate";
import type { Body, ShotInput, ShotResult, Table } from "@/core/types";

/** A flicked or pushed disc: it leaves at the given speed with no spin, already sliding as fast as it would roll. */
export const flickSimulate =
  (params: SimParams) =>
  (table: Table, bodies: Body[], shot: ShotInput, opts?: SimOptions): ShotResult => {
    const struck = bodies.map((b) => {
      if (b.id !== shot.bodyId) return b;
      const vx = Math.cos(shot.params.aim) * shot.params.speed;
      const vy = Math.sin(shot.params.aim) * shot.params.speed;
      return reclassify({ ...b, state: "rolling", velocity: { x: vx, y: vy, z: 0 }, angularVelocity: { x: -vy / b.radius, y: vx / b.radius, z: 0 } });
    });
    return simulateEvents(table, struck, params, opts);
  };

/**
 * Two-player games with a cue ball each. The app always strikes "white", so when the turn passes the two cue balls
 * trade places: the player at the table sees their ball as the white, and the opponent's as the yellow.
 */
export function swapCueBalls(bodies: Body[]): Body[] {
  const white = bodies.find((b) => b.id === "white")!;
  const yellow = bodies.find((b) => b.id === "yellow")!;
  return bodies.map((b) => (b.id === "white" ? { ...b, position: yellow.position } : b.id === "yellow" ? { ...b, position: white.position } : b));
}

/** Everything stopped dead, in case a judged position is carried into the next shot. */
export const atRest = (b: Body): Body => ({ ...b, state: "stationary", velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });

/** Games that add a new disc each shot: what was the striker stays on the table under a player's id. */
export function retireStriker(bodies: Body[], strikerId: string, newId: string): Body[] {
  return bodies.map((b) => (b.id === strikerId ? { ...b, id: newId } : b));
}
