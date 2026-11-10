import type { Pocket, Table, Vec3 } from "@/core/types";

/** A standard carrom board: 74 cm square playing area, four corner pockets, 31.5 mm coins and a 41 mm striker. */
export const CARROM = {
  size: 0.74,
  coinRadius: 0.01575,
  coinMass: 0.0055,
  strikerRadius: 0.0205,
  strikerMass: 0.015,
  /** Opening of each corner pocket between its two cushion tips. */
  pocketMouth: 0.046,
  /** Distance of the striker's baseline from the near cushion, to the striker's centre. */
  baselineY: 0.0745,
};

const v = (x: number, y: number): Vec3 => ({ x, y, z: 0 });

/** Corner pockets only: the cushions stop at the jaw tips, as on the cue-sport tables. */
export function createCarromTable(): Table {
  const S = CARROM.size;
  const g = CARROM.pocketMouth / Math.SQRT2;
  const pocket = (id: string, x: number, y: number, a: Vec3, b: Vec3): Pocket => ({
    id,
    position: v(x, y),
    radius: CARROM.pocketMouth / 2,
    mouth: { a, b },
  });
  return {
    width: S,
    length: S,
    pockets: [
      pocket("bl", 0, 0, v(g, 0), v(0, g)),
      pocket("br", S, 0, v(S - g, 0), v(S, g)),
      pocket("tl", 0, S, v(0, S - g), v(g, S)),
      pocket("tr", S, S, v(S - g, S), v(S, S - g)),
    ],
    cushions: [
      { id: "bottom", a: v(g, 0), b: v(S - g, 0) },
      { id: "top", a: v(g, S), b: v(S - g, S) },
      { id: "left", a: v(0, g), b: v(0, S - g) },
      { id: "right", a: v(S, g), b: v(S, S - g) },
    ],
    knuckles: [v(g, 0), v(S - g, 0), v(g, S), v(S - g, S), v(0, g), v(0, S - g), v(S, g), v(S, S - g)],
  };
}
