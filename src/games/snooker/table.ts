import type { Pocket, Table, Vec3 } from "@/core/types";

export interface SnookerDims {
  length: number;
  width: number;
  ballRadius: number;
  ballMass: number;
  baulkLine: number;
  dRadius: number;
  blackFromTop: number;
  cornerPocketMouth: number;
  middlePocketMouth: number;
}

/** Real 12 ft snooker proportions (WPBSA playing area 3569 x 1778 mm). Pocket sizes are unofficial, so configurable. */
export const SNOOKER: SnookerDims = {
  length: 3.569,
  width: 1.778,
  ballRadius: 0.02625,
  ballMass: 0.1406,
  baulkLine: 0.737,
  dRadius: 0.292,
  blackFromTop: 0.324,
  cornerPocketMouth: 0.089,
  middlePocketMouth: 0.102,
};

const v = (x: number, y: number): Vec3 => ({ x, y, z: 0 });

/**
 * A rectangular table with six pockets whose cushions stop at the jaw tips. A corner mouth is measured between the
 * two cushion tips (on adjacent cushions), so each tip sits mouth/sqrt(2) from the corner along its cushion; a
 * middle mouth spans the cushion line itself. Shared by snooker and pool.
 */
export function buildCushionedTable(L: number, W: number, cornerMouth: number, middleMouth: number): Table {
  const g = cornerMouth / Math.SQRT2;
  const h = middleMouth / 2;
  const pocket = (id: string, x: number, y: number, mouth: number, a: Vec3, b: Vec3): Pocket => ({
    id,
    position: v(x, y),
    radius: mouth / 2,
    mouth: { a, b },
  });
  return {
    width: W,
    length: L,
    pockets: [
      pocket("bl", 0, 0, cornerMouth, v(g, 0), v(0, g)),
      pocket("br", W, 0, cornerMouth, v(W - g, 0), v(W, g)),
      pocket("ml", 0, L / 2, middleMouth, v(0, L / 2 - h), v(0, L / 2 + h)),
      pocket("mr", W, L / 2, middleMouth, v(W, L / 2 - h), v(W, L / 2 + h)),
      pocket("tl", 0, L, cornerMouth, v(0, L - g), v(g, L)),
      pocket("tr", W, L, cornerMouth, v(W - g, L), v(W, L - g)),
    ],
    cushions: [
      { id: "bottom", a: v(g, 0), b: v(W - g, 0) },
      { id: "top", a: v(g, L), b: v(W - g, L) },
      { id: "left-lower", a: v(0, g), b: v(0, L / 2 - h) },
      { id: "left-upper", a: v(0, L / 2 + h), b: v(0, L - g) },
      { id: "right-lower", a: v(W, g), b: v(W, L / 2 - h) },
      { id: "right-upper", a: v(W, L / 2 + h), b: v(W, L - g) },
    ],
    knuckles: [
      v(g, 0), v(W - g, 0), v(g, L), v(W - g, L),
      v(0, g), v(0, L / 2 - h), v(0, L / 2 + h), v(0, L - g),
      v(W, g), v(W, L / 2 - h), v(W, L / 2 + h), v(W, L - g),
    ],
  };
}

export function createSnookerTable(overrides: Partial<SnookerDims> = {}): Table {
  const c = { ...SNOOKER, ...overrides };
  return buildCushionedTable(c.length, c.width, c.cornerPocketMouth, c.middlePocketMouth);
}
