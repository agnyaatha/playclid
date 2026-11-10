import type { Body, MotionState, Vec3 } from "../types";

/** Cloth/ball friction parameters (game presets supply these). */
export interface ClothParams {
  /** Sliding friction coefficient (ball-cloth). */
  muSliding: number;
  /** Rolling resistance coefficient. */
  muRolling: number;
  /** Spinning friction coefficient (about the vertical axis). */
  muSpinning: number;
  g: number;
}

export const EPS = 1e-9;

/** Velocity of the ball's contact point on the cloth (zero when rolling). */
export function slipVelocity(b: Body): Vec3 {
  const R = b.radius;
  return { x: b.velocity.x - R * b.angularVelocity.y, y: b.velocity.y + R * b.angularVelocity.x, z: 0 };
}

const norm2 = (x: number, y: number) => Math.hypot(x, y);

/** Classify a body's motion from its current velocity and spin. */
export function classify(b: Body): MotionState {
  if (b.state === "pocketed") return "pocketed";
  const u = slipVelocity(b);
  const speed = norm2(b.velocity.x, b.velocity.y);
  const spinXY = norm2(b.angularVelocity.x, b.angularVelocity.y);
  if (norm2(u.x, u.y) > 1e-7) return "sliding";
  if (speed > EPS) return "rolling";
  if (spinXY > EPS) return "sliding";
  return Math.abs(b.angularVelocity.z) > EPS ? "spinning" : "stationary";
}

/** Re-derive the motion state after an impulse, snapping a rolling ball's spin to its velocity. */
export function reclassify(b: Body): Body {
  const state = classify({ ...b, state: b.state === "pocketed" ? "pocketed" : "sliding" });
  if (state === "rolling") {
    const R = b.radius;
    return {
      ...b,
      state,
      angularVelocity: { x: -b.velocity.y / R, y: b.velocity.x / R, z: b.angularVelocity.z },
    };
  }
  if (state === "stationary") {
    return { ...b, state, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } };
  }
  return { ...b, state };
}

/** Time until this body next changes motion state, and the state it moves to. Infinity if it never does. */
export function timeToTransition(b: Body, p: ClothParams): { dt: number; to: MotionState } {
  const R = b.radius;
  const kz = (5 * p.muSpinning * p.g) / (2 * R);
  switch (b.state) {
    case "sliding": {
      const u = slipVelocity(b);
      return { dt: norm2(u.x, u.y) / (3.5 * p.muSliding * p.g), to: "rolling" };
    }
    case "rolling": {
      const speed = norm2(b.velocity.x, b.velocity.y);
      const dt = speed / (p.muRolling * p.g);
      return { dt, to: Math.abs(b.angularVelocity.z) > EPS ? "spinning" : "stationary" };
    }
    case "spinning":
      return { dt: Math.abs(b.angularVelocity.z) / kz, to: "stationary" };
    default:
      return { dt: Infinity, to: b.state };
  }
}

function decayZ(wz: number, dt: number, kz: number): number {
  const mag = Math.max(0, Math.abs(wz) - kz * dt);
  return Math.sign(wz) * mag;
}

/**
 * Advance a body by dt using the closed-form solution for its current state.
 * dt must not exceed timeToTransition(b).dt; the caller (event loop) guarantees this.
 */
export function evolve(b: Body, dt: number, p: ClothParams): Body {
  if (b.state === "stationary" || b.state === "pocketed" || dt <= 0) return b;
  const R = b.radius;
  const kz = (5 * p.muSpinning * p.g) / (2 * R);
  const { x: vx, y: vy } = b.velocity;
  const w = b.angularVelocity;
  const wz = decayZ(w.z, dt, kz);

  if (b.state === "sliding") {
    const u = slipVelocity(b);
    const un = norm2(u.x, u.y);
    const ux = un > EPS ? u.x / un : 0;
    const uy = un > EPS ? u.y / un : 0;
    const a = p.muSliding * p.g;
    const alpha = (5 * a) / (2 * R);
    return {
      ...b,
      position: {
        x: b.position.x + vx * dt - 0.5 * a * ux * dt * dt,
        y: b.position.y + vy * dt - 0.5 * a * uy * dt * dt,
        z: b.position.z,
      },
      velocity: { x: vx - a * ux * dt, y: vy - a * uy * dt, z: 0 },
      angularVelocity: { x: w.x - alpha * uy * dt, y: w.y + alpha * ux * dt, z: wz },
    };
  }

  if (b.state === "rolling") {
    const speed = norm2(vx, vy);
    const dirx = speed > EPS ? vx / speed : 0;
    const diry = speed > EPS ? vy / speed : 0;
    const a = p.muRolling * p.g;
    const s = Math.max(0, speed - a * dt);
    const travelled = speed * dt - 0.5 * a * dt * dt;
    return {
      ...b,
      position: { x: b.position.x + dirx * travelled, y: b.position.y + diry * travelled, z: b.position.z },
      velocity: { x: dirx * s, y: diry * s, z: 0 },
      angularVelocity: { x: (-diry * s) / R, y: (dirx * s) / R, z: wz },
    };
  }

  return { ...b, angularVelocity: { x: 0, y: 0, z: wz } };
}

/** Evolve to the exact transition time and snap numerically-zero quantities, returning the new state. */
export function applyTransition(b: Body, dt: number, p: ClothParams): Body {
  const to = timeToTransition(b, p).to;
  const e = evolve(b, dt, p);
  if (to === "rolling") {
    // Slip has reached zero: enforce the rolling constraint exactly.
    const R = e.radius;
    return {
      ...e,
      state: "rolling",
      angularVelocity: { x: -e.velocity.y / R, y: e.velocity.x / R, z: e.angularVelocity.z },
    };
  }
  if (to === "stationary") {
    return { ...e, state: "stationary", velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } };
  }
  return { ...e, state: to, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: e.angularVelocity.z } };
}
