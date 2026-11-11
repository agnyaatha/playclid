import type { Body, Vec3 } from "../types";
import { reclassify } from "./motion";
import type { SimParams } from "./params";

const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const len = (a: Vec3) => Math.hypot(a.x, a.y, a.z);

/** Moment of inertia of a solid sphere. */
const inertia = (b: Body) => 0.4 * b.mass * b.radius * b.radius;

/**
 * Every collision must leave the pair separating, at no less than this speed (m/s). Without a floor, a near-zero
 * closing speed produces a velocity too small to survive the at-rest threshold and the same contact fires forever.
 * It is set as high as is invisible (1 mm/s) because it also spaces out sustained contact: a rolling ball pressing
 * a sliding one re-collides every (2 * floor / relative deceleration) seconds, for as long as the slide lasts.
 */
export const MIN_SEPARATION = 1e-3;

/**
 * Ball-ball collision: inelastic normal impulse plus Coulomb friction between the ball surfaces (produces throw).
 * Friction is applied in the table plane only. Returns the post-collision bodies (inputs are not mutated).
 */
export function resolveBallBall(a: Body, b: Body, p: SimParams): [Body, Body] {
  const d = sub(b.position, a.position);
  const dist = Math.hypot(d.x, d.y);
  const n: Vec3 = { x: d.x / dist, y: d.y / dist, z: 0 };
  const vn = dot(sub(a.velocity, b.velocity), n);
  if (vn < -1e-12) return [a, b];

  const reduced = (a.mass * b.mass) / (a.mass + b.mass);
  const Jn = reduced * (vn + Math.max(p.ballBall.restitution * vn, MIN_SEPARATION));
  let va = sub(a.velocity, scale(n, Jn / a.mass));
  let vb = add(b.velocity, scale(n, Jn / b.mass));
  let wa = a.angularVelocity;
  let wb = b.angularVelocity;

  // Surface slip at the contact point in the contact tangent plane. It keeps its vertical part: topspin or backspin
  // makes the surfaces slip up or down past each other, which takes a share of the friction and leaves less to throw
  // the object ball sideways. That is why a rolling cue ball throws much less than a stun shot.
  const s = add(sub(a.velocity, b.velocity), add(scale(cross(a.angularVelocity, n), a.radius), scale(cross(b.angularVelocity, n), b.radius)));
  const full = sub(s, scale(n, dot(s, n)));
  const st: Vec3 = p.ballBall.planar ? { x: full.x, y: full.y, z: 0 } : full;
  const sm = len(st);
  if (sm > 1e-9) {
    const t = scale(st, 1 / sm);
    // Balls stay on the cloth, so only the horizontal part of the friction moves them; all of it turns them.
    const th: Vec3 = { x: t.x, y: t.y, z: 0 };
    const stickCap = sm / ((1 / a.mass + 1 / b.mass) * dot(th, th) + (a.radius * a.radius) / inertia(a) + (b.radius * b.radius) / inertia(b));
    const curve = p.ballBall.frictionCurve;
    const mu = curve ? curve.a + curve.b * Math.exp(-curve.c * sm) : p.ballBall.friction;
    const Jt = Math.min(mu * Jn, stickCap);
    va = sub(va, scale(th, Jt / a.mass));
    vb = add(vb, scale(th, Jt / b.mass));
    wa = add(wa, scale(cross(scale(n, a.radius), scale(t, -Jt)), 1 / inertia(a)));
    wb = add(wb, scale(cross(scale(n, -b.radius), scale(t, Jt)), 1 / inertia(b)));
  }
  return [
    reclassify({ ...a, velocity: va, angularVelocity: wa }),
    reclassify({ ...b, velocity: vb, angularVelocity: wb }),
  ];
}

/** Ball-cushion impact. `n` is the cushion normal pointing into the table. */
export function resolveCushion(ball: Body, n: Vec3, p: SimParams): Body {
  const vn = -dot(ball.velocity, n);
  if (vn < -1e-12) return ball;
  const e = cushionRestitution(p, vn);
  const q = e === p.cushion.restitution ? p : { ...p, cushion: { ...p.cushion, restitution: e } };
  return q.cushion.model === "mathavan" && vn > MIN_SEPARATION ? mathavanImpact(ball, n, vn, q) : impulseImpact(ball, n, Math.max(vn, 0), q);
}

/** Cushion restitution at normal impact speed `vn`, lowered past the rigid-cushion limit when a falloff is set. */
export function cushionRestitution(p: SimParams, vn: number): number {
  const f = p.cushion.falloff;
  if (!f || vn <= f.above) return p.cushion.restitution;
  return Math.max(f.min, p.cushion.restitution - f.perMps * (vn - f.above));
}

/** Impulse steps through the compression phase; restitution takes proportionally fewer. */
const MATHAVAN_STEPS = 120;

/**
 * Mathavan, Jackson & Parkin (2010): the cushion nose touches the ball above its equator, so the impact also presses
 * the ball into the cloth. The normal impulse is advanced in small steps; at each one the ball can slip at the
 * cushion and at the cloth, and Coulomb friction acts against each slip. Compression ends when the ball stops moving
 * into the cushion; restitution ends when its work reaches e^2 times the compression work.
 *
 * The local frame has y into the cushion and z up. Forces are applied as vectors at their contact points rather
 * than through the paper's expanded component equations.
 */
function mathavanImpact(ball: Body, n: Vec3, vn: number, p: SimParams): Body {
  const R = ball.radius;
  const M = ball.mass;
  const I = inertia(ball);
  const sin = p.cushion.contactHeight - 1;
  const cos = Math.sqrt(Math.max(0, 1 - sin * sin));
  const muW = p.cushion.friction;
  const muS = p.cloth.muSliding;

  const yAxis: Vec3 = { x: -n.x, y: -n.y, z: 0 };
  const xAxis: Vec3 = { x: yAxis.y, y: -yAxis.x, z: 0 };
  const zAxis: Vec3 = { x: 0, y: 0, z: 1 };
  const local = (u: Vec3): Vec3 => ({ x: dot(u, xAxis), y: dot(u, yAxis), z: u.z });

  let v = local(ball.velocity);
  v.z = 0;
  let w = local(ball.angularVelocity);
  const rI: Vec3 = { x: 0, y: R * cos, z: R * sin };
  const rC: Vec3 = { x: 0, y: 0, z: -R };
  const dP = (M * vn) / MATHAVAN_STEPS;

  /** Advance one impulse step and return the work done against the normal, signed. */
  const step = () => {
    // Slip at the cushion, in its tangent plane: along x, and along e pointing up the cushion face.
    const vI = add(v, cross(w, rI));
    const sx = vI.x;
    const se = -sin * vI.y + cos * vI.z;
    const sI = Math.hypot(sx, se);
    const cosPhi = sI > 1e-7 ? sx / sI : 0;
    const sinPhi = sI > 1e-7 ? se / sI : 0;
    // Slip at the cloth.
    const vC = add(v, cross(w, rC));
    const sC = Math.hypot(vC.x, vC.y);
    const cosPsi = sC > 1e-7 ? vC.x / sC : 0;
    const sinPsi = sC > 1e-7 ? vC.y / sC : 0;

    const fI: Vec3 = {
      x: -muW * cosPhi,
      y: -cos + muW * sin * sinPhi,
      z: -sin - muW * cos * sinPhi,
    };
    // The cloth reaction balances the downward push of the cushion, so the ball stays on the table.
    const pC = -fI.z;
    const fC: Vec3 = { x: -muS * pC * cosPsi, y: -muS * pC * sinPsi, z: 0 };

    const before = v.y;
    v = { x: v.x + ((fI.x + fC.x) * dP) / M, y: v.y + ((fI.y + fC.y) * dP) / M, z: 0 };
    w = add(w, scale(add(cross(rI, fI), cross(rC, fC)), dP / I));
    return 0.5 * dP * (before + v.y) * cos;
  };

  let compression = 0;
  for (let i = 0; i < 20 * MATHAVAN_STEPS && v.y > 0; i++) compression += step();
  const target = p.cushion.restitution * p.cushion.restitution * compression;
  let rebound = 0;
  for (let i = 0; i < 20 * MATHAVAN_STEPS && rebound < target; i++) rebound -= step();

  // Numerical floor: the ball must leave the cushion.
  if (v.y > -MIN_SEPARATION) v.y = -MIN_SEPARATION;
  const world = (u: Vec3): Vec3 => add(add(scale(xAxis, u.x), scale(yAxis, u.y)), scale(zAxis, u.z));
  const velocity = world(v);
  return reclassify({ ...ball, velocity: { x: velocity.x, y: velocity.y, z: 0 }, angularVelocity: world(w) });
}

/**
 * Single-impulse impact for flat discs and very slow contacts: normal restitution, Coulomb friction at the contact
 * point, and a torque when the contact is off the equator.
 */
function impulseImpact(ball: Body, n: Vec3, vn: number, p: SimParams): Body {
  const R = ball.radius;
  const h = (p.cushion.contactHeight - 1) * R;
  const rh = Math.sqrt(Math.max(0, R * R - h * h));
  const r: Vec3 = { x: -n.x * rh, y: -n.y * rh, z: h };

  const I = inertia(ball);
  const Jn = ball.mass * (vn + Math.max(p.cushion.restitution * vn, MIN_SEPARATION));
  const Fn = scale(n, Jn);
  let v = add(ball.velocity, scale(Fn, 1 / ball.mass));
  let w = add(ball.angularVelocity, scale(cross(r, Fn), 1 / I));

  const cv = add(v, cross(w, r));
  const st = sub(cv, scale(n, dot(cv, n)));
  const sm = len(st);
  if (sm > 1e-9) {
    const dir = scale(st, 1 / sm);
    const rd = dot(r, dir);
    const cap = sm / (1 / ball.mass + (dot(r, r) - rd * rd) / I);
    const Jt = Math.min(p.cushion.friction * Jn, cap);
    const F = scale(dir, -Jt);
    v = add(v, scale(F, 1 / ball.mass));
    w = add(w, scale(cross(r, F), 1 / I));
  }
  return reclassify({ ...ball, velocity: { x: v.x, y: v.y, z: 0 }, angularVelocity: w });
}
