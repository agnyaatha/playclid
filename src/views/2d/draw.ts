import type { Body, Table } from "@/core/types";
import { cushionOutline, pocketOpening, railOpening } from "../jaws";
import { toScreen, type Viewport } from "./geometry";
import { visibleMarks, type Prediction } from "./prediction";
import type { GameTheme } from "./theme";

export interface AimAids {
  aimLine: boolean;
  ghostBall: boolean;
  prediction: boolean;
}

export interface Marker {
  x: number;
  y: number;
  radius: number;
  kind: "zone" | "pocket";
}

export interface Scene {
  table: Table;
  theme: GameTheme;
  bodies: Body[];
  /** Striker id, used for the cue stick and aid lines. */
  cueId: string;
  /** Lesson targets: a circle the cue ball must finish in, or a pocket to pot into. */
  markers?: Marker[];
  /** Present while the player is aiming; absent during playback. */
  aiming?: { aim: number; power: number; prediction: Prediction | null; aids: AimAids };
  /** The striker's recent path during playback, oldest first. */
  trail?: { x: number; y: number }[];
}

const IVORY = "#f0e9d8";
const BRASS = "#d4a94e";

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Fine speckle so large fills read as cloth or wood and not as flat colour. */
function speckle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: number, dark: number) {
  const count = Math.round((w * h) / 90);
  for (let i = 0; i < count; i++) {
    const a = Math.random();
    ctx.fillStyle = a > 0.5 ? `rgba(255,255,255,${light * Math.random()})` : `rgba(0,0,0,${dark * Math.random()})`;
    ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 1, 1);
  }
}

/**
 * Everything that never moves: rail, cushions, cloth, pockets and markings. It is drawn once per size into its own
 * canvas, so a playback frame only has to blit it and draw the balls.
 */
export function renderTableLayer(vp: Viewport, cssW: number, cssH: number, dpr: number, table: Table, theme: GameTheme): HTMLCanvasElement {
  const canvas = makeCanvas(cssW * dpr, cssH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = vp.scale;
  const { surface, frame, band } = theme;
  const area = (inset: number) => {
    const a = toScreen(vp, { x: -inset, y: -inset });
    const b = toScreen(vp, { x: table.width + inset, y: table.length + inset });
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };

  // Rail: a lit wooden frame with a soft drop shadow.
  const outer = area(frame);
  const radius = Math.min(0.045, frame * 0.5) * s;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 0.09 * s;
  ctx.shadowOffsetY = 0.03 * s;
  const railGrad = ctx.createLinearGradient(0, outer.y, 0, outer.y + outer.h);
  railGrad.addColorStop(0, surface.rail);
  railGrad.addColorStop(1, surface.railDark);
  ctx.fillStyle = railGrad;
  ctx.beginPath();
  ctx.roundRect(outer.x, outer.y, outer.w, outer.h, radius);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(outer.x, outer.y, outer.w, outer.h, radius);
  ctx.clip();
  speckle(ctx, outer.x, outer.y, outer.w, outer.h, 0.05, 0.1);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(outer.x + 0.5, outer.y + 0.5, outer.w - 1, outer.h - 1, radius);
  ctx.stroke();

  const trace = (points: { x: number; y: number }[]) => {
    ctx.beginPath();
    points.forEach((p, i) => {
      const c = toScreen(vp, p);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.closePath();
  };

  // The opening inside the rail is dark: only the cushions and the cloth cover it, so the pockets read as holes.
  trace(railOpening(table, band));
  ctx.fillStyle = theme.opening ?? "#070605";
  ctx.fill();

  // The cloth, with its light pooled in the middle.
  const cloth = area(0);
  const glow = ctx.createRadialGradient(
    cloth.x + cloth.w / 2,
    cloth.y + cloth.h / 2,
    Math.min(cloth.w, cloth.h) * 0.2,
    cloth.x + cloth.w / 2,
    cloth.y + cloth.h / 2,
    Math.hypot(cloth.w, cloth.h) * 0.56,
  );
  glow.addColorStop(0, surface.cloth);
  glow.addColorStop(1, surface.clothShade);
  ctx.fillStyle = glow;
  ctx.fillRect(cloth.x, cloth.y, cloth.w, cloth.h);
  speckle(ctx, cloth.x, cloth.y, cloth.w, cloth.h, 0.05, 0.07);
  // A hairline where the cushion nose meets the cloth.
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cloth.x, cloth.y, cloth.w, cloth.h);

  theme.drawMarkings(ctx, vp, table);

  // Pockets: a dark well with a lip. The cushions go on last, so their rounded ends sit crisply over the opening.
  for (const p of table.pockets) {
    if (p.unmarked) continue;
    const { centre, radius, throat } = pocketOpening(p, table, band);
    if (throat) {
      trace(throat);
      ctx.fillStyle = "#050505";
      ctx.fill();
    }
    const c = toScreen(vp, centre);
    const r = radius * s;
    const well = ctx.createRadialGradient(c.x, c.y, r * 0.1, c.x, c.y, r);
    well.addColorStop(0, "#000");
    well.addColorStop(0.82, "#050505");
    well.addColorStop(1, "#1b1512");
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = surface.trim;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, 0.006 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = surface.cushion;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  for (const c of table.cushions) {
    trace(cushionOutline(c, table, band));
    ctx.fill();
    ctx.stroke();
  }
  return canvas;
}

/** Ball sprites are built once per ball and size; a frame only blits them. */
const sprites = new Map<string, HTMLCanvasElement>();

function ballSprite(id: string, r: number, dpr: number, theme: GameTheme): { image: HTMLCanvasElement; size: number } {
  const key = `${theme.shape}/${theme.surface.cloth}/${id}/${Math.round(r * dpr * 4)}`;
  const pad = 2;
  const size = 2 * r + 2 * pad;
  let image = sprites.get(key);
  if (!image) {
    if (sprites.size > 400) sprites.clear();
    image = makeCanvas(size * dpr, size * dpr);
    const ctx = image.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = theme.ballColour(id);
    ctx.fillRect(0, 0, size, size);
    theme.decorateBall?.(ctx, c, c, r, id);
    if (theme.shape === "sphere") {
      // Overhead light: a soft sheen falling away to a dark rim, and a small hard highlight.
      const shade = ctx.createRadialGradient(c - r * 0.32, c - r * 0.38, r * 0.05, c, c, r * 1.05);
      shade.addColorStop(0, "rgba(255,255,255,0.42)");
      shade.addColorStop(0.32, "rgba(255,255,255,0.06)");
      shade.addColorStop(0.72, "rgba(0,0,0,0.12)");
      shade.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(c - r * 0.36, c - r * 0.42, r * 0.14, r * 0.1, -0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const shade = ctx.createLinearGradient(c - r, c - r, c + r, c + r);
      shade.addColorStop(0, "rgba(255,255,255,0.22)");
      shade.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();
    if (theme.shape === "disc") {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c, c, r - 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    sprites.set(key, image);
  }
  return { image, size };
}

function dashedPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], colour: string, width: number) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
}

/** A dashed line with an arrowhead where it ends. */
function arrowPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], colour: string) {
  dashedPath(ctx, points, colour, 2);
  const to = points[points.length - 1];
  const from = points[points.length - 2];
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 8;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(to.x + Math.cos(a) * size, to.y + Math.sin(a) * size);
  ctx.lineTo(to.x + Math.cos(a + 2.5) * size, to.y + Math.sin(a + 2.5) * size);
  ctx.lineTo(to.x + Math.cos(a - 2.5) * size, to.y + Math.sin(a - 2.5) * size);
  ctx.closePath();
  ctx.fill();
}

let labelFont: string | null = null;

/** A small readout on a dark pill, legible on any cloth. */
function drawLabel(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, text: string) {
  labelFont ??= `600 11px ${getComputedStyle(document.body).fontFamily}`;
  ctx.font = labelFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 10;
  const h = 17;
  ctx.fillStyle = "rgba(10,13,11,0.82)";
  ctx.beginPath();
  ctx.roundRect(at.x - w / 2, at.y - h / 2, w, h, 4);
  ctx.fill();
  ctx.fillStyle = IVORY;
  ctx.fillText(text, at.x, at.y + 0.5);
}

/** Draw the moving part of a frame over the cached table layer. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  cssW: number,
  cssH: number,
  dpr: number,
  layer: CanvasImageSource,
  scene: Scene,
) {
  const s = vp.scale;
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(layer, 0, 0, cssW, cssH);

  for (const m of scene.markers ?? []) {
    const c = toScreen(vp, m);
    ctx.beginPath();
    ctx.arc(c.x, c.y, m.radius * s, 0, Math.PI * 2);
    if (m.kind === "zone") {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, m.radius * s);
      g.addColorStop(0, "rgba(212,169,78,0.05)");
      g.addColorStop(1, "rgba(212,169,78,0.3)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.setLineDash([6, 5]);
    }
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const cue = scene.bodies.find((b) => b.id === scene.cueId);
  const aiming = scene.aiming;
  const R = cue?.radius ?? 0;

  if (scene.trail && scene.trail.length > 1) {
    const pts = scene.trail.map((p) => toScreen(vp, p));
    ctx.lineCap = "round";
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = `rgba(240,233,216,${(0.34 * i) / pts.length})`;
      ctx.lineWidth = Math.max(1, 0.5 * R * s);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // Aids go under the balls.
  if (aiming && cue && cue.state !== "pocketed") {
    const { prediction: pr, aids } = aiming;
    if (aids.aimLine) {
      const path = pr?.path ?? [];
      const pts =
        path.length > 1
          ? path.map((p) => toScreen(vp, p))
          : [toScreen(vp, cue.position), toScreen(vp, { x: cue.position.x + Math.cos(aiming.aim) * 1.5, y: cue.position.y + Math.sin(aiming.aim) * 1.5 })];
      dashedPath(ctx, pts, "rgba(240,233,216,0.85)", 1.6);
    }
    if (pr?.ghost && aids.ghostBall) {
      const g = toScreen(vp, pr.ghost);
      ctx.fillStyle = "rgba(240,233,216,0.12)";
      ctx.strokeStyle = "rgba(240,233,216,0.95)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(g.x, g.y, R * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (aids.prediction) {
      if (pr?.hitPath) arrowPath(ctx, pr.hitPath.map((p) => toScreen(vp, p)), BRASS);
      if (pr?.cuePath) arrowPath(ctx, pr.cuePath.map((p) => toScreen(vp, p)), IVORY);
    }
  }

  // Contact shadows, then the balls, so no ball's shadow falls across another ball.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (const b of scene.bodies) {
    if (b.state === "pocketed") continue;
    const c = toScreen(vp, b.position);
    const r = b.radius * s;
    ctx.beginPath();
    ctx.ellipse(c.x + r * 0.16, c.y + r * 0.2, r * 1.04, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of scene.bodies) {
    if (b.state === "pocketed") continue;
    const c = toScreen(vp, b.position);
    const { image, size } = ballSprite(b.id, b.radius * s, dpr, scene.theme);
    ctx.drawImage(image, c.x - size / 2, c.y - size / 2, size, size);
  }

  // Angle readouts go over the balls, so a number is never hidden.
  if (aiming && cue && cue.state !== "pocketed") {
    for (const m of visibleMarks(aiming.prediction, aiming.aids)) {
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1.25;
      for (const line of m.lines) {
        ctx.beginPath();
        line.forEach((p, i) => {
          const c = toScreen(vp, p);
          if (i === 0) ctx.moveTo(c.x, c.y);
          else ctx.lineTo(c.x, c.y);
        });
        ctx.stroke();
      }
      drawLabel(ctx, toScreen(vp, m.labelAt), m.label);
    }
  }

  // Cue stick behind the striker, pulled back further with more power. Discs are flicked, so have no cue.
  if (aiming && cue && cue.state !== "pocketed" && scene.theme.shape === "sphere") {
    const dx = Math.cos(aiming.aim);
    const dy = Math.sin(aiming.aim);
    const gap = R * 1.5 + aiming.power * 0.2;
    const at = (d: number) => toScreen(vp, { x: cue.position.x - dx * d, y: cue.position.y - dy * d });
    const tip = at(gap);
    const butt = at(gap + 1.45);
    const len = Math.hypot(butt.x - tip.x, butt.y - tip.y);
    const nx = -(butt.y - tip.y) / len;
    const ny = (butt.x - tip.x) / len;
    const wTip = Math.max(1, 0.0045 * s);
    const wButt = Math.max(2.4, 0.0125 * s);
    const grad = ctx.createLinearGradient(tip.x, tip.y, butt.x, butt.y);
    grad.addColorStop(0, "#efdcb0");
    grad.addColorStop(0.62, "#b98a4e");
    grad.addColorStop(0.66, "#3a1f10");
    grad.addColorStop(1, "#160b05");
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tip.x + nx * wTip, tip.y + ny * wTip);
    ctx.lineTo(butt.x + nx * wButt, butt.y + ny * wButt);
    ctx.lineTo(butt.x - nx * wButt, butt.y - ny * wButt);
    ctx.lineTo(tip.x - nx * wTip, tip.y - ny * wTip);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#3f7fb3";
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, wTip + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
