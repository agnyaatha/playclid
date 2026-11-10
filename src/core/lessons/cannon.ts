import type { ShotResult } from "../types";

export interface CannonScan {
  /** The other balls the striker touched, in order. */
  hit: string[];
  /** Cushions the striker touched before its second contact (all of them, if there was none). */
  cushions: number;
  /** The striker met two different balls. */
  made: boolean;
}

/** Follow the striker through a shot, for the games scored on what it touches rather than what it pots. */
export function scanCannon(result: ShotResult, strikerId: string): CannonScan {
  const hit: string[] = [];
  let cushions = 0;
  for (const e of result.events) {
    if (e.type === "cushion" && e.body === strikerId) cushions++;
    if (e.type === "collision" && (e.a === strikerId || e.b === strikerId)) {
      const other = e.a === strikerId ? e.b : e.a;
      if (!hit.includes(other)) hit.push(other);
      if (hit.length === 2) return { hit, cushions, made: true };
    }
  }
  return { hit, cushions, made: false };
}
