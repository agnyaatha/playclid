import type { Game } from "@/core/game";
import type { SimOptions } from "@/core/sim/simulate";
import { simulateEvents } from "@/core/sim/simulate";
import type { Body, ShotInput, ShotResult } from "@/core/types";
import { strikeBall } from "@/games/snooker/strike";
import { headSpot, makeBall, startingBodies, whiteAtHead } from "./layout";
import { POOL_CUE, POOL_PARAMS } from "./params";
import { poolRules } from "./rules";
import { createPoolTable, POOL } from "./table";

export const CUE_BALL_ID = "white";
/** Cue speed at full power. Gives the cue ball about 12 m/s, the top of the range measured for pro breaks. */
const MAX_SPEED = 9;

export const pool: Game = {
  id: "pool",
  name: "8-Ball Pool",
  params: POOL_PARAMS,
  rules: poolRules,
  input: {
    strikerId: CUE_BALL_ID,
    defaultAim: Math.PI / 2,
    maxSpeed: MAX_SPEED,
    tipOffset: { max: POOL_CUE.maxOffset },
    buildShot: (c) => ({
      bodyId: CUE_BALL_ID,
      params: { aim: c.aim, speed: c.power * MAX_SPEED, sideOffset: c.spinX, vertOffset: c.spinY },
    }),
  },
  createTable: () => createPoolTable(),
  createInitialBodies: (table) => startingBodies(table),
  createBody: makeBall,
  /** Ball in hand: the cue ball may go anywhere on the cloth that is clear of other balls. */
  placeStriker(table, bodies, p) {
    const R = POOL.ballRadius;
    if (p.x < R || p.x > table.width - R || p.y < R || p.y > table.length - R) return null;
    const clash = bodies.some(
      (b) => b.id !== CUE_BALL_ID && b.state !== "pocketed" && Math.hypot(b.position.x - p.x, b.position.y - p.y) < 2 * R,
    );
    if (clash) return null;
    return bodies.map((b) => (b.id === CUE_BALL_ID ? { ...b, position: { x: p.x, y: p.y, z: 0 } } : b));
  },
  spots: (table) => ({ head: headSpot(table), foot: { x: table.width / 2, y: table.length * 0.75 } }),
  afterShot(result, table) {
    if (result.final.find((b) => b.id === CUE_BALL_ID)?.state !== "pocketed") return { bodies: result.final };
    return {
      bodies: result.final.map((b) => (b.id === CUE_BALL_ID ? whiteAtHead(table) : b)),
      note: "Cue ball potted: it goes back on the head spot",
    };
  },
  simulate(table, bodies: Body[], shot: ShotInput, opts?: SimOptions): ShotResult {
    const struck = bodies.map((b) =>
      b.id === shot.bodyId
        ? strikeBall(
            b,
            {
              aim: shot.params.aim,
              speed: shot.params.speed,
              sideOffset: shot.params.sideOffset ?? 0,
              vertOffset: shot.params.vertOffset ?? 0,
            },
            POOL_CUE,
          ).ball
        : b,
    );
    return simulateEvents(table, struck, POOL_PARAMS, opts);
  },
};
