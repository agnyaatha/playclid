import { toScreen } from "@/views/2d/geometry";
import type { GameTheme } from "@/views/2d/theme";
import { CARROM } from "./table";

export function ballColour(id: string): string {
  if (id === "striker") return "#e8dcc0";
  if (id === "queen") return "#b5202b";
  return id.startsWith("w") ? "#ecdcb6" : "#23201d";
}

const INK = "rgba(52,26,12,0.8)";
const RED = "#a3262a";

export const carromTheme: GameTheme = {
  surface: { cloth: "#dcbd8b", clothShade: "#b8935d", cushion: "#7a4a24", rail: "#4a2a13", railDark: "#27140a", trim: "#d4a94e" },
  frame: 0.06,
  band: 0.018,
  shape: "disc",
  ballColour,
  /** Baselines on all four sides with their end circles, the diagonal arrows and the centre circle. */
  drawMarkings(ctx, vp, table) {
    const S = table.width;
    const pt = (x: number, y: number) => toScreen(vp, { x, y });
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    const inset = 0.105;
    const y0 = CARROM.baselineY;
    const gap = 0.032;
    /** One side of the board, given a map from side-local (along, across) to table coordinates. */
    const side = (map: (a: number, c: number) => { x: number; y: number }) => {
      const seg = (a1: number, c1: number, a2: number, c2: number) => {
        const p = map(a1, c1);
        const q = map(a2, c2);
        const s = pt(p.x, p.y);
        const e = pt(q.x, q.y);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      };
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      seg(inset, y0 - gap / 2, S - inset, y0 - gap / 2);
      seg(inset, y0 + gap / 2, S - inset, y0 + gap / 2);
      for (const a of [inset, S - inset]) {
        const c = map(a, y0);
        const sc = pt(c.x, c.y);
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, (gap / 2) * vp.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };
    side((a, c) => ({ x: a, y: c }));
    side((a, c) => ({ x: a, y: S - c }));
    side((a, c) => ({ x: c, y: a }));
    side((a, c) => ({ x: S - c, y: a }));

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    for (const [cx, cy, dx, dy] of [
      [0, 0, 1, 1],
      [S, 0, -1, 1],
      [0, S, 1, -1],
      [S, S, -1, -1],
    ]) {
      const a = pt(cx + dx * 0.05, cy + dy * 0.05);
      const b = pt(cx + dx * 0.17, cy + dy * 0.17);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    const c = pt(S / 2, S / 2);
    for (const [r, colour] of [
      [0.085, INK],
      [0.078, INK],
      [0.016, RED],
    ] as const) {
      ctx.strokeStyle = colour;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * vp.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  },
  /** Concentric turned rings on each coin. */
  decorateBall(ctx, cx, cy, r, id) {
    const dark = id.startsWith("b");
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.28)" : "rgba(60,30,12,0.4)";
    ctx.lineWidth = Math.max(0.6, r * 0.08);
    for (const k of [0.78, 0.5]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
};
