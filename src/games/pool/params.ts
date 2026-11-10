import type { SimParams } from "@/core/sim/params";
import type { CueParams } from "@/games/snooker/strike";

/** Pool cloth is slightly slicker than snooker cloth, and pool cushions a little livelier (Alciatore, Mathavan). */
export const POOL_PARAMS: SimParams = {
  cloth: { muSliding: 0.2, muRolling: 0.01, muSpinning: 0.01, g: 9.81 },
  ballBall: { restitution: 0.95, friction: 0.06 },
  cushion: { restitution: 0.93, friction: 0.14, contactHeight: 7 / 5, model: "mathavan" },
};

/** A 19 oz pool cue with a leather tip. */
export const POOL_CUE: CueParams = { cueMass: 0.54, tipRestitution: 0.75, maxOffset: 0.5, squirtPerOffset: 0.04 };
