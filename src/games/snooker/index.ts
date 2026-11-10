import type { Game } from "@/core/game";
import { simulateEvents, type SimOptions } from "@/core/sim/simulate";
import type { Body, ShotInput, ShotResult } from "@/core/types";
import { colourSpots, makeBall, startingBodies, whiteInD } from "./layout";
import { SNOOKER_PARAMS } from "./params";
import { snookerRules } from "./rules";
import { SNOOKER } from "./table";
import { DEFAULT_CUE, strikeBall, type StrikeInput } from "./strike";
import { createSnookerTable } from "./table";

export const CUE_BALL_ID = "white";

/** Build a core ShotInput from typed snooker strike parameters. */
export function snookerShot(s: StrikeInput): ShotInput {
  return {
    bodyId: CUE_BALL_ID,
    params: { aim: s.aim, speed: s.speed, sideOffset: s.sideOffset, vertOffset: s.vertOffset },
  };
}

export const snooker: Game = {
  id: "snooker",
  name: "Snooker",
  params: SNOOKER_PARAMS,
  rules: snookerRules,
  input: {
    strikerId: CUE_BALL_ID,
    defaultAim: Math.PI / 2,
    maxSpeed: 5,
    tipOffset: { max: DEFAULT_CUE.maxOffset },
    buildShot: (c) => snookerShot({ aim: c.aim, speed: c.power * 5, sideOffset: c.spinX, vertOffset: c.spinY }),
  },
  afterShot(result, table) {
    if (result.final.find((b) => b.id === CUE_BALL_ID)?.state !== "pocketed") return { bodies: result.final };
    return {
      bodies: result.final.map((b) => (b.id === CUE_BALL_ID ? whiteInD(table) : b)),
      note: "White potted: foul (rules arrive in a later phase), white replaced in the D",
    };
  },
  createTable: () => createSnookerTable(),
  createInitialBodies: (table) => startingBodies(table),
  createBody: makeBall,
  /** The white may be placed anywhere in the D (not on a ball). */
  placeStriker(table, bodies, p) {
    const dx = p.x - table.width / 2;
    const dy = p.y - SNOOKER.baulkLine;
    if (Math.hypot(dx, dy) > SNOOKER.dRadius - SNOOKER.ballRadius || dy > 0) return null;
    const clash = bodies.some(
      (b) => b.id !== CUE_BALL_ID && b.state !== "pocketed" && Math.hypot(b.position.x - p.x, b.position.y - p.y) < 2 * SNOOKER.ballRadius,
    );
    if (clash) return null;
    return bodies.map((b) => (b.id === CUE_BALL_ID ? { ...b, position: { x: p.x, y: p.y, z: 0 } } : b));
  },
  spots: (table) => colourSpots(table),
  simulate(table, bodies: Body[], shot: ShotInput, opts?: SimOptions): ShotResult {
    const struck = bodies.map((b) =>
      b.id === shot.bodyId
        ? strikeBall(b, {
            aim: shot.params.aim,
            speed: shot.params.speed,
            sideOffset: shot.params.sideOffset ?? 0,
            vertOffset: shot.params.vertOffset ?? 0,
          }).ball
        : b,
    );
    return simulateEvents(table, struck, SNOOKER_PARAMS, opts);
  },
};
