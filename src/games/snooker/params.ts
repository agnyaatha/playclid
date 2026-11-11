import { ALCIATORE_THROW, CUSHION_FALLOFF, type SimParams } from "@/core/sim/params";

/** Snooker cloth, ball and cushion parameters (Mathavan 2009/2010, Alciatore). Calibrate against video later. */
export const SNOOKER_PARAMS: SimParams = {
  cloth: { muSliding: 0.212, muRolling: 0.0128, muSpinning: 0.01, g: 9.81 },
  ballBall: { restitution: 0.95, friction: 0.06, frictionCurve: ALCIATORE_THROW },
  cushion: { restitution: 0.88, friction: 0.14, contactHeight: 7 / 5, model: "mathavan", falloff: CUSHION_FALLOFF },
};
