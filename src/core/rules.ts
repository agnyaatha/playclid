import type { Body, ShotResult, Table } from "./types";

/** Opaque per-frame state owned by a game's rules; the UI only passes it back in. */
export type RulesState = object;

export interface Judgement {
  state: RulesState;
  /** Bodies to continue from: potted balls respotted, the cue ball replaced if it was potted. */
  bodies: Body[];
  message: string;
  foul: boolean;
  /** Points scored by the shooter (0 on a foul). */
  points: number;
}

export interface Scoreboard {
  players: { label: string; score: number }[];
  /** Index of the player at the table. */
  current: number;
  /** Points scored in the current visit. */
  breakPoints: number;
  /** Short description of what the shooter must play, e.g. "Red" or "Colour". */
  on: string;
  over: boolean;
  /** Result line once the frame is over. */
  result?: string;
  /** Points still on the table, where the game counts them. */
  remaining?: number;
  /** A situation worth flagging, e.g. that a player now needs snookers. */
  warning?: string;
}

/** A game's rulebook: turns finished shots into scores, fouls and the next position. */
export interface RulesEngine {
  /** Start a frame. `redsLeft` lets a drill start part-way (snooker: 0 begins the colour clearance). */
  newFrame(opts?: { redsLeft?: number }): RulesState;
  judge(state: RulesState, result: ShotResult, ctx: { table: Table; nominated?: string | null }): Judgement;
  scoreboard(state: RulesState): Scoreboard;
  /** True when the incoming player may ask for the last shot to be replayed (snooker: foul and a miss). */
  missOffered?(state: RulesState): boolean;
  /** The state after the replay is asked for: the penalty stands, and the offender plays again from the old position. */
  replayAfterMiss?(before: RulesState, after: RulesState): RulesState;
  /** True when the player at the table may place the cue ball (after a foul or a potted cue ball). */
  ballInHand?(state: RulesState): boolean;
  /** Balls the shooter may legally play first right now, with the points each is worth. Used by the AI coach. */
  targets?(state: RulesState, bodies: Body[], nominated?: string | null): { id: string; value: number }[];
  /** Balls the shooter may nominate right now (snooker: the colour after a red), or null when none applies. */
  nominations?(state: RulesState, bodies: Body[]): string[] | null;
}
