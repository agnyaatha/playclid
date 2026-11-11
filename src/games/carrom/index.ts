import type { Game } from "@/core/game";
import type { SimParams } from "@/core/sim/params";
import { flickSimulate } from "../shared";
import { BASELINE_RANGE, makeCoin, startingBodies, STRIKER, strikerClear, strikerStart } from "./layout";
import { carromRules } from "./rules";
import { createCarromTable } from "./table";

/**
 * Carrom discs slide on a powdered board and do not roll, so sliding and rolling friction are set equal: a disc
 * slows at the same rate in either motion state. Cushions are low and hit at the disc's centre height.
 */
export const CARROM_PARAMS: SimParams = {
  cloth: { muSliding: 0.12, muRolling: 0.12, muSpinning: 0.05, g: 9.81 },
  ballBall: { restitution: 0.9, friction: 0.03, planar: true },
  cushion: { restitution: 0.7, friction: 0.1, contactHeight: 1, model: "impulse" },
};

const MAX_SPEED = 4.5;

export const carrom: Game = {
  id: "carrom",
  name: "Carrom",
  params: CARROM_PARAMS,
  rules: carromRules,
  input: {
    strikerId: STRIKER,
    defaultAim: Math.PI / 2,
    maxSpeed: MAX_SPEED,
    placement: { label: "Striker position on the baseline", min: -1, max: 1 },
    tipOffset: null,
    buildShot: (c) => ({
      bodyId: STRIKER,
      params: { aim: c.aim, speed: c.power * MAX_SPEED, placement: c.spinX },
    }),
  },
  createTable: () => createCarromTable(),
  createInitialBodies: (table) => startingBodies(table),
  createBody: makeCoin,
  spots: (table) => ({ baseline: { x: table.width / 2, y: strikerStart(table).position.y } }),
  /** Slide the striker along its baseline to where the control says. */
  place(bodies, controls) {
    return bodies.map((b) =>
      b.id === STRIKER ? { ...b, position: { ...b.position, x: strikerClear(bodies, b.position.x + controls.spinX * BASELINE_RANGE).position.x } } : b,
    );
  },
  afterShot(result) {
    if (result.final.find((b) => b.id === STRIKER)?.state !== "pocketed") return { bodies: result.final };
    return {
      bodies: result.final.map((b) => (b.id === STRIKER ? strikerClear(result.final) : b)),
      note: "Striker potted: it goes back to the baseline",
    };
  },
  resetStriker: (bodies) => bodies.map((b) => (b.id === STRIKER ? strikerClear(bodies) : b)),
  /** A flick: the striker leaves with the given speed and no spin, already in its sliding-equals-rolling state. */
  simulate: flickSimulate(CARROM_PARAMS),
};
