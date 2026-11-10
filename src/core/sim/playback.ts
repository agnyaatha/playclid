import type { Body, ShotResult } from "../types";
import { evolve, type ClothParams } from "./motion";

/**
 * State of every body at time t of a finished shot. Between events each ball follows its closed-form motion,
 * so a replay never needs to re-simulate and is independent of frame rate.
 */
export function stateAt(result: ShotResult, t: number, cloth: ClothParams): Body[] {
  const time = Math.min(Math.max(t, 0), result.duration);
  const { events } = result;
  // Last event at or before `time` (events are time-ordered).
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].t <= time) lo = mid + 1;
    else hi = mid;
  }
  const k = lo - 1;
  const base = k < 0 ? result.initial : result.keyframes[k];
  const t0 = k < 0 ? 0 : events[k].t;
  return base.map((b) => evolve(b, time - t0, cloth));
}
