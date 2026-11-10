import { buildCushionedTable } from "@/games/snooker/table";
import type { Table } from "@/core/types";

/** A 9 ft pool table (2.54 x 1.27 m playing area) with standard 2.25 in balls. */
export interface PoolDims {
  length: number;
  width: number;
  ballRadius: number;
  ballMass: number;
  cornerPocketMouth: number;
  sidePocketMouth: number;
}

export const POOL: PoolDims = {
  length: 2.54,
  width: 1.27,
  ballRadius: 0.028575,
  ballMass: 0.17,
  cornerPocketMouth: 0.1143,
  sidePocketMouth: 0.127,
};

export function createPoolTable(overrides: Partial<PoolDims> = {}): Table {
  const c = { ...POOL, ...overrides };
  return buildCushionedTable(c.length, c.width, c.cornerPocketMouth, c.sidePocketMouth);
}
