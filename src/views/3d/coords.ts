import type { Vec3 } from "@/core/types";

/**
 * Physics axes (x across the table to the player's right, y up the table towards the top cushion, z up) map to
 * three.js axes (X along the table, Y up, Z across) as (x, y, z) -> (Z, X, Y). That is a cyclic permutation, so
 * handedness is kept and angular velocities map the same way as positions.
 */
export const toThree = (p: Vec3): [number, number, number] => [p.y, p.z, p.x];

export const fromThree = (x: number, y: number, z: number): Vec3 => ({ x: z, y: x, z: y });

/** Horizontal unit direction for an aim angle, in three.js axes. */
export const aimDirection = (aim: number): [number, number] => [Math.sin(aim), Math.cos(aim)];
