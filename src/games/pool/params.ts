import { ALCIATORE_THROW, CUSHION_FALLOFF, type SimParams } from "@/core/sim/params";
import { STANDARD_SQUIRT, type CueParams } from "@/games/snooker/strike";

/** Pool cloth is slightly slicker than snooker cloth, and pool cushions a little livelier (Alciatore, Mathavan). */
export const POOL_PARAMS: SimParams = {
  cloth: { muSliding: 0.2, muRolling: 0.01, muSpinning: 0.01, g: 9.81 },
  ballBall: { restitution: 0.95, friction: 0.06, frictionCurve: ALCIATORE_THROW },
  // WPA: the cushion nose sits at 63.5% of the ball's diameter, which is 1.27 R above the cloth.
  cushion: { restitution: 0.93, friction: 0.14, contactHeight: 1.27, model: "mathavan", falloff: CUSHION_FALLOFF },
};

/** A 19 oz pool cue with a leather tip and a standard shaft. */
export const POOL_CUE: CueParams = { cueMass: 0.54, tipRestitution: 0.75, maxOffset: 0.5, squirtPerOffset: STANDARD_SQUIRT };
