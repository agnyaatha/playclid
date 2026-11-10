import { toScreen } from "@/views/2d/geometry";
import type { GameTheme } from "@/views/2d/theme";
import { SNOOKER } from "./table";

const COLOURS: Record<string, string> = {
  white: "#f6f4ec",
  yellow: "#f2cf1d",
  green: "#1f8a46",
  brown: "#7a4a22",
  blue: "#1f5fc4",
  pink: "#f08ab4",
  black: "#17171a",
};

export function ballColour(id: string): string {
  return id.startsWith("red") ? "#c8201e" : (COLOURS[id] ?? "#888");
}

export const snookerTheme: GameTheme = {
  surface: { cloth: "#11734a", clothShade: "#0a4a30", cushion: "#0d5c3b", rail: "#5b3418", railDark: "#2c170a", trim: "#d4a94e" },
  frame: 0.13,
  band: 0.05,
  shape: "sphere",
  ballColour,
  /** Baulk line and the D, which opens towards the baulk cushion. */
  drawMarkings(ctx, vp, table) {
    ctx.strokeStyle = "rgba(240,233,216,0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    const l1 = toScreen(vp, { x: 0, y: SNOOKER.baulkLine });
    const l2 = toScreen(vp, { x: table.width, y: SNOOKER.baulkLine });
    ctx.beginPath();
    ctx.moveTo(l1.x, l1.y);
    ctx.lineTo(l2.x, l2.y);
    ctx.stroke();
    const dc = toScreen(vp, { x: table.width / 2, y: SNOOKER.baulkLine });
    ctx.beginPath();
    ctx.arc(dc.x, dc.y, SNOOKER.dRadius * vp.scale, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.stroke();
  },
};
