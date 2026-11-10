import type { ClothParams } from "./motion";

export interface SimParams {
  cloth: ClothParams;
  ballBall: { restitution: number; friction: number };
  cushion: {
    restitution: number;
    friction: number;
    /** Height of the cushion contact point above the table, as a multiple of ball radius (7/5 for snooker and pool). */
    contactHeight: number;
    /**
     * "mathavan" integrates the impact through compression and restitution with slip at both the cushion and the
     * cloth (Mathavan et al. 2010); `restitution` is then the energetic coefficient, not the rebound ratio. The paper
     * uses 0.98; snooker here uses 0.88, which calibrates the rebound to the measured 0.818.
     * "impulse" is a single-impulse model for flat discs.
     */
    model: "mathavan" | "impulse";
  };
}

/**
 * Scale the cloth friction (sliding and rolling) by `k`: above 1 is a slower cloth, below 1 a faster one. Lets a
 * player match the simulation to a real table or to video, since the published coefficients vary with cloth,
 * humidity and ball condition.
 */
export function scaleCloth(p: SimParams, k: number): SimParams {
  return { ...p, cloth: { ...p.cloth, muSliding: p.cloth.muSliding * k, muRolling: p.cloth.muRolling * k } };
}
