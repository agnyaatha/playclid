import type { ClothParams } from "./motion";

export interface SimParams {
  cloth: ClothParams;
  ballBall: {
    restitution: number;
    /** Constant ball-ball friction, used when `frictionCurve` is absent. */
    friction: number;
    /**
     * Speed-dependent friction μ = a + b·exp(-c·slip), with slip the relative surface speed at contact (m/s).
     * Alciatore's fit to measured throw (TP A.14 / A.28): a = 0.00995, b = 0.108, c = 1.088. Slow shots throw more.
     */
    frictionCurve?: { a: number; b: number; c: number };
    /**
     * Flat discs: friction acts only in the table plane. Discs are modelled as spheres whose "roll" is a bookkeeping
     * device (see collisions.md), so that spin must not take part in the contact friction.
     */
    planar?: boolean;
  };
  cushion: {
    /**
     * Above `above` m/s of normal speed the cushion deforms and the impact loses more energy, so the restitution
     * falls by `perMps` for every m/s beyond it, down to `min`. Mathavan et al. (2010) give 2.5 m/s as the limit of
     * the rigid-cushion assumption.
     */
    falloff?: { above: number; perMps: number; min: number };
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

/** Alciatore's fit of ball-ball friction against relative surface speed (TP A.14 / A.28), shared by the cue games. */
export const ALCIATORE_THROW = { a: 9.951e-3, b: 0.108, c: 1.088 };

/**
 * Past the rigid-cushion limit of 2.5 m/s normal speed (Mathavan et al. 2010) cushions lose more energy as they
 * deform. The slope and floor are estimates: no published curve was found to calibrate them against.
 */
export const CUSHION_FALLOFF = { above: 2.5, perMps: 0.04, min: 0.7 };
