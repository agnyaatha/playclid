import type { Body, Table } from "@/core/types";
import { POOL } from "./table";

export const WHITE = "white";

export const solidIds = [1, 2, 3, 4, 5, 6, 7].map((n) => `ball${n}`);
export const stripeIds = [9, 10, 11, 12, 13, 14, 15].map((n) => `ball${n}`);
export const EIGHT = "ball8";
export const isSolid = (id: string) => solidIds.includes(id);
export const isStripe = (id: string) => stripeIds.includes(id);

/** Gap between racked balls so none start in contact. */
const RACK_EPSILON = 0.0005;

export const footSpot = (table: Table) => ({ x: table.width / 2, y: table.length * 0.75 });
export const headSpot = (table: Table) => ({ x: table.width / 2, y: table.length * 0.25 });

export function makeBall(id: string, x: number, y: number): Body {
  return {
    id,
    radius: POOL.ballRadius,
    mass: POOL.ballMass,
    state: "stationary",
    position: { x, y, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  };
}

/** The 8-ball rack: apex on the foot spot, the 8 in the middle of the third row, a solid and a stripe in the back corners. */
export function rackBodies(table: Table): Body[] {
  const R = POOL.ballRadius;
  const dx = 2 * R + RACK_EPSILON;
  const dy = Math.sqrt(3) * R + RACK_EPSILON;
  const foot = footSpot(table);
  const slots: { x: number; y: number }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k <= row; k++) slots.push({ x: foot.x + (k - row / 2) * dx, y: foot.y + row * dy });
  }
  const ids: string[] = new Array(15);
  ids[4] = EIGHT;
  ids[10] = "ball1";
  ids[14] = "ball9";
  // Fill the other slots alternating solids and stripes, so neither group clusters.
  const solids = solidIds.filter((id) => id !== "ball1");
  const stripes = stripeIds.filter((id) => id !== "ball9");
  let i = 0;
  for (let slot = 0; slot < 15; slot++) {
    if (ids[slot]) continue;
    ids[slot] = i % 2 === 0 ? solids.shift()! : stripes.shift()!;
    i++;
  }
  return ids.map((id, slot) => makeBall(id, slots[slot].x, slots[slot].y));
}

export function whiteAtHead(table: Table): Body {
  const h = headSpot(table);
  return makeBall(WHITE, h.x, h.y);
}

export function startingBodies(table: Table): Body[] {
  return [whiteAtHead(table), ...rackBodies(table)];
}
