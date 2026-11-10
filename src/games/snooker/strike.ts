import type { Body } from "@/core/types";
import { reclassify } from "@/core/sim/motion";

/** Cue and tip parameters (Alciatore: leather tip e ~ 0.71-0.75; a snooker cue weighs about 0.5 kg). */
export interface CueParams {
  cueMass: number;
  tipRestitution: number;
  /** Tip offsets are clamped to this fraction of ball radius; beyond it a miscue is likely. */
  maxOffset: number;
  /** Squirt angle (rad) per unit of sideways offset as a fraction of R. Roughly 0.02-0.05 for light snooker cues. */
  squirtPerOffset: number;
}

export const DEFAULT_CUE: CueParams = { cueMass: 0.5, tipRestitution: 0.75, maxOffset: 0.5, squirtPerOffset: 0.04 };

/** Shot parameters as the UI provides them. Offsets are fractions of ball radius (right and up are positive). */
export interface StrikeInput {
  /** Aim direction in radians: direction vector is (cos, sin) in table x-y coordinates. */
  aim: number;
  /** Cue speed at impact in m/s. */
  speed: number;
  sideOffset: number;
  vertOffset: number;
}

export interface StrikeResult {
  ball: Body;
  /** True when the requested tip offset exceeded the miscue limit and was clamped. */
  clamped: boolean;
}

/**
 * Level-cue strike. The tip delivers an impulse J along the aim line at offset (a, b) from the ball centre;
 * J = (1+e) V / (1/m + 1/M + 5(a^2+b^2) / (2 m R^2)), which sets speed (offset strikes are weaker), topspin/backspin
 * (-bJ/I about the right axis) and sidespin (aJ/I about vertical). Sidespin also squirts the ball away from the
 * struck side by a small angle, modelled as linear in the offset.
 */
export function strikeBall(ball: Body, input: StrikeInput, cue: CueParams = DEFAULT_CUE): StrikeResult {
  const R = ball.radius;
  let sx = input.sideOffset;
  let sy = input.vertOffset;
  const mag = Math.hypot(sx, sy);
  const clamped = mag > cue.maxOffset;
  if (clamped) {
    sx = (sx / mag) * cue.maxOffset;
    sy = (sy / mag) * cue.maxOffset;
  }
  const a = sx * R;
  const b = sy * R;
  const m = ball.mass;
  const I = 0.4 * m * R * R;
  const J = ((1 + cue.tipRestitution) * input.speed) / (1 / m + 1 / cue.cueMass + (a * a + b * b) / I);
  const speed = J / m;

  // Hitting right of centre squirts the ball left, which is a counter-clockwise (positive) turn.
  const squirt = cue.squirtPerOffset * sx;
  const dir = input.aim + squirt;
  const right = { x: Math.sin(input.aim), y: -Math.cos(input.aim) };
  const wRight = (-b * J) / I;
  const wUp = (a * J) / I;

  return {
    clamped,
    ball: reclassify({
      ...ball,
      state: "sliding",
      velocity: { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed, z: 0 },
      angularVelocity: { x: right.x * wRight, y: right.y * wRight, z: wUp },
    }),
  };
}
