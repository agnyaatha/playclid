/** Game-agnostic primitives shared by every game (snooker, pool, carrom...). All units SI (metres, seconds, kg). */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type MotionState = "stationary" | "spinning" | "sliding" | "rolling" | "pocketed";

/** A ball or disc on the table. */
export interface Body {
  id: string;
  radius: number;
  mass: number;
  position: Vec3;
  velocity: Vec3;
  angularVelocity: Vec3;
  state: MotionState;
}

export interface Pocket {
  id: string;
  position: Vec3;
  radius: number;
  /**
   * Jaw mouth between the two cushion tips. When present, a ball is potted as its centre crosses this segment from
   * the table side; otherwise it is potted on entering the circle of `radius` around `position`.
   */
  mouth?: { a: Vec3; b: Vec3 };
}

/** A straight cushion segment from a to b. */
export interface CushionSegment {
  id: string;
  a: Vec3;
  b: Vec3;
}

export interface Table {
  width: number;
  length: number;
  pockets: Pocket[];
  /** Straight cushion faces. A ball only bounces off one where it touches within the segment's extent. */
  cushions: CushionSegment[];
  /** Cushion tips at the pocket jaws: balls bounce off these points. */
  knuckles?: Vec3[];
}

/** Game-specific shot parameters are carried in `params` so the core stays generic. */
export interface ShotInput {
  bodyId: string;
  params: Record<string, number>;
}

export type SimEvent =
  | { type: "collision"; t: number; a: string; b: string }
  | { type: "cushion"; t: number; body: string; cushion: string }
  | { type: "pocket"; t: number; body: string; pocket: string }
  | { type: "transition"; t: number; body: string; from: MotionState; to: MotionState };

export interface ShotResult {
  /** Body states at t = 0 (after the strike), the starting point for replay. */
  initial: Body[];
  events: SimEvent[];
  /** keyframes[i] is the state of every body just after events[i]; replay evaluates closed-form motion between them. */
  keyframes: Body[][];
  duration: number;
  final: Body[];
}
