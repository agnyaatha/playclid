import type { Game } from "@/core/game";
import type { Body, Table } from "@/core/types";
import { pool } from "@/games/pool";
import { footSpot, makeBall, whiteAtHead } from "@/games/pool/layout";
import { POOL } from "@/games/pool/table";
import { NINE, nineRules } from "./rules";

/** Rows of the diamond rack, 1 at the front and 9 in the middle. */
const RACK = [["ball1"], ["ball2", "ball3"], ["ball4", NINE, "ball5"], ["ball6", "ball7"], ["ball8"]];
const GAP = 0.0005;

function startingBodies(table: Table): Body[] {
  const foot = footSpot(table);
  const dx = 2 * POOL.ballRadius + GAP;
  const dy = Math.sqrt(3) * POOL.ballRadius + GAP;
  const balls = RACK.flatMap((row, r) => row.map((id, k) => makeBall(id, foot.x + (k - (row.length - 1) / 2) * dx, foot.y + r * dy)));
  return [whiteAtHead(table), ...balls];
}

/** 9-ball is played on the pool table with the pool physics; only the rack and the rules differ. */
export const nineball: Game = {
  ...pool,
  id: "nineball",
  name: "9-Ball",
  rules: nineRules,
  createInitialBodies: startingBodies,
};
