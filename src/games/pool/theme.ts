import { toScreen } from "@/views/2d/geometry";
import type { GameTheme } from "@/views/2d/theme";
import { isStripe } from "./layout";

const COLOURS: Record<number, string> = {
  1: "#f2c81d",
  2: "#1d4fb8",
  3: "#d42b27",
  4: "#5d2a8c",
  5: "#ee7f1c",
  6: "#157a43",
  7: "#7c1d22",
  8: "#141417",
};

const numberOf = (id: string) => Number(id.replace("ball", ""));

export function ballColour(id: string): string {
  if (id === "white") return "#f6f1e3";
  const n = numberOf(id);
  return COLOURS[n > 8 ? n - 8 : n] ?? "#888";
}

const IVORY = "#f6f1e3";

export const poolTheme: GameTheme = {
  surface: { cloth: "#1a6f96", clothShade: "#0f4765", cushion: "#155a7d", rail: "#2a2320", railDark: "#120e0c", trim: "#c9ccd1" },
  frame: 0.12,
  band: 0.05,
  shape: "sphere",
  ballColour,
  /** Head string and foot spot. */
  drawMarkings(ctx, vp, table) {
    ctx.strokeStyle = "rgba(240,233,216,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    const a = toScreen(vp, { x: 0, y: table.length * 0.25 });
    const b = toScreen(vp, { x: table.width, y: table.length * 0.25 });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const f = toScreen(vp, { x: table.width / 2, y: table.length * 0.75 });
    ctx.fillStyle = "rgba(240,233,216,0.6)";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Stripes are a band of ivory above and below the colour; numbered balls wear a small ivory disc. */
  decorateBall(ctx, cx, cy, r, id) {
    if (id === "white") return;
    if (isStripe(id)) {
      ctx.fillStyle = IVORY;
      ctx.fillRect(cx - r, cy - r, 2 * r, r * 0.42);
      ctx.fillRect(cx - r, cy + r * 0.58, 2 * r, r * 0.42);
    }
    ctx.fillStyle = IVORY;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#141417";
    ctx.font = `700 ${r * 0.62}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(numberOf(id)), cx, cy + r * 0.03);
  },
  paintBall3D(ctx, w, h, id) {
    if (id === "white") {
      ctx.fillStyle = IVORY;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#c8201e";
      for (const u of [0, 0.25, 0.5, 0.75]) {
        ctx.beginPath();
        ctx.ellipse(u * w, h / 2, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    const n = numberOf(id);
    ctx.fillStyle = ballColour(id);
    ctx.fillRect(0, 0, w, h);
    if (isStripe(id)) {
      ctx.fillStyle = IVORY;
      ctx.fillRect(0, 0, w, h * 0.27);
      ctx.fillRect(0, h * 0.73, w, h * 0.27);
    }
    for (const u of [0.25, 0.75]) {
      ctx.fillStyle = IVORY;
      ctx.beginPath();
      ctx.ellipse(u * w, h / 2, h * 0.17, h * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#141417";
      ctx.font = `700 ${h * 0.22}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), u * w, h / 2 + 1);
    }
  },
};
