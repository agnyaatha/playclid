import type { Pocket, Vec3 } from "./types";

/** Where to aim to pot into a pocket: the middle of its jaw mouth, or its centre when it has none. */
export function pocketAimPoint(p: Pocket): Vec3 {
  if (!p.mouth) return p.position;
  return { x: (p.mouth.a.x + p.mouth.b.x) / 2, y: (p.mouth.a.y + p.mouth.b.y) / 2, z: 0 };
}
