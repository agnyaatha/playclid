import type { Body, Table } from "@/core/types";
import { SNOOKER } from "./table";

export interface Spot {
  id: string;
  x: number;
  y: number;
}

/** Gap added between racked reds so no two start in contact (the exact touching rack is not a well-defined dynamical system). */
export const RACK_EPSILON = 0.0005;

/**
 * Table coordinates: x across the width (0 at the left cushion viewed from baulk), y along the length,
 * with y = 0 at the baulk cushion and y = length at the top cushion.
 */
export function colourSpots(table: Table): Record<"yellow" | "green" | "brown" | "blue" | "pink" | "black", Spot> {
  const cx = table.width / 2;
  return {
    yellow: { id: "yellow", x: cx + SNOOKER.dRadius, y: SNOOKER.baulkLine },
    green: { id: "green", x: cx - SNOOKER.dRadius, y: SNOOKER.baulkLine },
    brown: { id: "brown", x: cx, y: SNOOKER.baulkLine },
    blue: { id: "blue", x: cx, y: table.length / 2 },
    pink: { id: "pink", x: cx, y: (table.length / 2 + table.length) / 2 },
    black: { id: "black", x: cx, y: table.length - SNOOKER.blackFromTop },
  };
}

/** Fifteen reds in a triangle, apex nearest the pink and base towards the top cushion. */
export function redPositions(table: Table): Spot[] {
  const R = SNOOKER.ballRadius;
  const pink = colourSpots(table).pink;
  const dx = 2 * R + RACK_EPSILON;
  const dy = Math.sqrt(3) * R + RACK_EPSILON;
  const apexY = pink.y + 2 * R + RACK_EPSILON;
  const reds: Spot[] = [];
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k <= row; k++) {
      reds.push({ id: `red${reds.length + 1}`, x: pink.x + (k - row / 2) * dx, y: apexY + row * dy });
    }
  }
  return reds;
}

export function makeBall(id: string, x: number, y: number): Body {
  return {
    id,
    radius: SNOOKER.ballRadius,
    mass: SNOOKER.ballMass,
    state: "stationary",
    position: { x, y, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  };
}

/** Standard frame start: white in the D, fifteen reds racked, six colours on their spots. */
export function startingBodies(table: Table): Body[] {
  const spots = colourSpots(table);
  return [
    whiteInD(table),
    ...redPositions(table).map((r) => makeBall(r.id, r.x, r.y)),
    ...Object.values(spots).map((s) => makeBall(s.id, s.x, s.y)),
  ];
}

/** Where the white is placed at the start and after being potted: the middle of the D. */
export function whiteInD(table: Table): Body {
  return makeBall("white", table.width / 2, SNOOKER.baulkLine - SNOOKER.dRadius / 2);
}
