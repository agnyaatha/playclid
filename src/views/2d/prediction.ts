import type { Game } from "@/core/game";
import type { SimParams } from "@/core/sim/params";
import { stateAt } from "@/core/sim/playback";
import type { Body, ShotInput, Table } from "@/core/types";

export interface Point {
  x: number;
  y: number;
}

export interface Prediction {
  /** Path of the struck ball up to its first ball contact (or until it stops), including cushion bounces. */
  path: Point[];
  /** Cue-ball centre at first contact: where the ghost ball sits. */
  ghost: Point | null;
  hitId: string | null;
  /** Velocity of the ball that was hit, and of the struck ball, just after contact. */
  hitVelocity: Point | null;
  cueVelocity: Point | null;
}

/** Predict a shot up to the first ball-ball contact by running the real engine on a scratch copy of the table. */
export function predictShot(game: Game, table: Table, bodies: Body[], shot: ShotInput, params?: SimParams): Prediction {
  const res = game.simulate(table, bodies, shot, { stopWhen: (e) => e.type === "collision", params });
  const last = res.events[res.events.length - 1];
  const hit = last?.type === "collision" ? last : null;

  const times = new Set<number>([0, res.duration]);
  for (const e of res.events) times.add(e.t);
  const samples = 40;
  for (let i = 1; i < samples; i++) times.add((res.duration * i) / samples);
  const idx = res.initial.findIndex((b) => b.id === shot.bodyId);
  const path = [...times]
    .sort((a, b) => a - b)
    .map((t) => stateAt(res, t, (params ?? game.params).cloth)[idx].position)
    .map((p) => ({ x: p.x, y: p.y }));

  if (!hit) return { path, ghost: null, hitId: null, hitVelocity: null, cueVelocity: null };

  const after = res.keyframes[res.keyframes.length - 1];
  const cue = after.find((b) => b.id === shot.bodyId)!;
  const hitId = hit.a === shot.bodyId ? hit.b : hit.a;
  const other = after.find((b) => b.id === hitId)!;
  return {
    path,
    ghost: { x: cue.position.x, y: cue.position.y },
    hitId,
    hitVelocity: { x: other.velocity.x, y: other.velocity.y },
    cueVelocity: { x: cue.velocity.x, y: cue.velocity.y },
  };
}
