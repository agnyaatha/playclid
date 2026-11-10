import type { Table } from "@/core/types";

/**
 * Screen mapping for the 2D view. The table is drawn with its length running left to right, baulk on the left.
 * Looking from baulk towards the top cushion, the table's x axis (the player's right) points down the screen.
 */
export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

/** Width of cushion and rail drawn around the playing area, in metres. */
export const FRAME = 0.1;

export function fitViewport(cssW: number, cssH: number, table: Table, frame = FRAME): Viewport {
  const totalL = table.length + 2 * frame;
  const totalW = table.width + 2 * frame;
  const scale = Math.min(cssW / totalL, cssH / totalW);
  return {
    scale,
    ox: (cssW - table.length * scale) / 2,
    oy: (cssH - table.width * scale) / 2,
  };
}

export const toScreen = (vp: Viewport, p: { x: number; y: number }) => ({
  x: vp.ox + p.y * vp.scale,
  y: vp.oy + p.x * vp.scale,
});

export const toTable = (vp: Viewport, sx: number, sy: number) => ({
  x: (sy - vp.oy) / vp.scale,
  y: (sx - vp.ox) / vp.scale,
});
