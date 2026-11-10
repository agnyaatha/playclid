import type { RulesEngine } from "./rules";
import type { SimOptions } from "./sim/simulate";
import type { SimParams } from "./sim/params";
import type { Body, ShotInput, ShotResult, Table } from "./types";

export type GameId = "snooker" | "pool" | "carrom";

/** What the player controls before a shot, as the shared UI sees it. */
export interface ControlState {
  /** Aim direction in radians, (cos, sin) in table x-y coordinates. */
  aim: number;
  /** 0..1 fraction of the game's maximum speed. */
  power: number;
  /** Tip offset as fractions of ball radius (ignored by games without one). */
  spinX: number;
  spinY: number;
}

/** How a game turns the shared controls into a shot; carrom would use a flick with no tip offset. */
export interface InputScheme {
  /** The body the player strikes (cue ball, striker). */
  strikerId: string;
  defaultAim: number;
  /** Strike speed at full power, m/s. */
  maxSpeed: number;
  /** Where the striker starts, for games where it slides along a baseline (carrom). Shown as a slider on `spinX`. */
  placement?: { label: string; min: number; max: number };
  /** Null when the player cannot choose where the tip hits (e.g. a carrom flick). */
  tipOffset: { max: number } | null;
  buildShot(c: ControlState): ShotInput;
}

/** Everything a game must supply; the core engine, lesson player and views depend only on this. */
export interface Game {
  id: GameId;
  name: string;
  /** Physics parameters, also needed to replay a ShotResult. */
  params: SimParams;
  input: InputScheme;
  createTable(): Table;
  /** Place the striker at a point chosen by the player, or return null if that spot is not allowed. */
  placeStriker?(table: Table, bodies: Body[], point: { x: number; y: number }): Body[] | null;
  /** Move the striker to where the controls say it starts, for games with a `placement` input. */
  place?(bodies: Body[], controls: ControlState): Body[];
  createInitialBodies(table: Table): Body[];
  /** A stationary ball or disc of this game at (x, y), used to build lesson layouts. */
  createBody(id: string, x: number, y: number): Body;
  /** Named positions lessons may refer to, e.g. snooker's colour spots. */
  spots?(table: Table): Record<string, { x: number; y: number }>;
  /** Run one shot to completion (physics models are game-specific). */
  simulate(table: Table, bodies: Body[], shot: ShotInput, opts?: SimOptions): ShotResult;
  /** Bodies to continue from after a shot (e.g. respot a potted cue ball). Defaults to the final state. */
  afterShot?(result: ShotResult, table: Table): { bodies: Body[]; note?: string };
  /** The rulebook, when the game has one. Free practice runs without it. */
  rules?: RulesEngine;
}
