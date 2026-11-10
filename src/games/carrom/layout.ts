import type { Body, Table } from "@/core/types";
import { CARROM } from "./table";

export const STRIKER = "striker";
export const QUEEN = "queen";
export const isWhite = (id: string) => id.startsWith("w");
export const isBlack = (id: string) => id.startsWith("b");

/** Gap between racked coins so none start in contact. */
const EPS = 0.0004;

export function makeCoin(id: string, x: number, y: number): Body {
  const striker = id === STRIKER;
  return {
    id,
    radius: striker ? CARROM.strikerRadius : CARROM.coinRadius,
    mass: striker ? CARROM.strikerMass : CARROM.coinMass,
    state: "stationary",
    position: { x, y, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  };
}

/** The striker on its baseline, in the middle. */
export const strikerStart = (table: Table): Body => makeCoin(STRIKER, table.width / 2, CARROM.baselineY);

/**
 * The opening pattern: the queen in the centre, six coins in a ring around her, and twelve in the outer ring,
 * with the colours alternating so each side has nine.
 */
export function coinBodies(table: Table): Body[] {
  const r = CARROM.coinRadius + EPS;
  const cx = table.width / 2;
  const cy = table.length / 2;
  const at = (dist: number, angle: number) => ({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
  const slots: { x: number; y: number }[] = [];
  for (let k = 0; k < 6; k++) slots.push(at(2 * r, (k * Math.PI) / 3 + Math.PI / 6)); // inner ring
  for (let k = 0; k < 6; k++) {
    slots.push(at(4 * r, (k * Math.PI) / 3 + Math.PI / 6)); // outer, in line with the inner coins
    slots.push(at(2 * Math.sqrt(3) * r, (k * Math.PI) / 3)); // outer, between them
  }
  // Inner ring alternates; the outer ring alternates in the order slots were laid out.
  let w = 0;
  let b = 0;
  const coins = slots.map((p, i) => {
    const white = i < 6 ? i % 2 === 0 : (i - 6) % 2 === 0;
    return makeCoin(white ? `w${++w}` : `b${++b}`, p.x, p.y);
  });
  return [makeCoin(QUEEN, cx, cy), ...coins];
}

export const startingBodies = (table: Table): Body[] => [strikerStart(table), ...coinBodies(table)];
