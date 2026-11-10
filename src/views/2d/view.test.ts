import { describe, expect, it } from "vitest";
import { stateAt } from "@/core/sim/playback";
import { snooker, snookerShot } from "@/games/snooker";
import { colourSpots } from "@/games/snooker/layout";
import { fitViewport, toScreen, toTable } from "./geometry";
import { carrom } from "@/games/carrom";
import { predictShot, separateLabels } from "./prediction";

const table = snooker.createTable();
const bodies = () => snooker.createInitialBodies(table);
const UP = Math.PI / 2;
const cloth = snooker.params.cloth;

describe("viewport", () => {
  const vp = fitViewport(1000, 600, table);

  it("round-trips table and screen coordinates", () => {
    const p = { x: 0.7, y: 2.1 };
    const s = toScreen(vp, p);
    const back = toTable(vp, s.x, s.y);
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
  });

  it("draws baulk on the left and, from baulk, yellow on the right-hand (lower) side", () => {
    const spots = colourSpots(table);
    expect(toScreen(vp, { x: 0, y: 0 }).x).toBeLessThan(toScreen(vp, { x: 0, y: table.length }).x);
    expect(toScreen(vp, spots.yellow).y).toBeGreaterThan(toScreen(vp, spots.green).y);
  });

  it("fits the whole table with its frame inside the canvas", () => {
    const a = toScreen(vp, { x: 0, y: 0 });
    const b = toScreen(vp, { x: table.width, y: table.length });
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBeGreaterThan(0);
    expect(b.x).toBeLessThan(1000);
    expect(b.y).toBeLessThan(600);
  });
});

describe("playback", () => {
  const res = snooker.simulate(table, bodies(), snookerShot({ aim: UP + 0.02, speed: 3, sideOffset: 0.1, vertOffset: 0.2 }));

  it("returns the start state at t = 0 and the final state at the end", () => {
    const first = stateAt(res, 0, cloth);
    const last = stateAt(res, res.duration + 5, cloth);
    res.initial.forEach((b, i) => expect(first[i].position).toEqual(b.position));
    res.final.forEach((b, i) => {
      expect(last[i].position.x).toBeCloseTo(b.position.x, 9);
      expect(last[i].position.y).toBeCloseTo(b.position.y, 9);
    });
  });

  it("matches the keyframe at every event time", () => {
    res.events.forEach((e, k) => {
      const s = stateAt(res, e.t, cloth);
      s.forEach((b, i) => {
        expect(b.position.x).toBeCloseTo(res.keyframes[k][i].position.x, 9);
        expect(b.position.y).toBeCloseTo(res.keyframes[k][i].position.y, 9);
      });
    });
  });

  it("moves continuously: just before an event the positions are almost the event positions", () => {
    for (const e of res.events) {
      if (e.t < 1e-3) continue;
      const before = stateAt(res, e.t - 1e-6, cloth);
      const at = stateAt(res, e.t, cloth);
      before.forEach((b, i) => {
        // 1e-6 s at up to ~7 m/s is at most ~7 micrometres.
        expect(Math.hypot(b.position.x - at[i].position.x, b.position.y - at[i].position.y)).toBeLessThan(2e-5);
      });
    }
  });
});

describe("shot prediction", () => {
  it("finds the first ball hit and sends it along the line of centres", () => {
    // Only the white and the apex red on the table: a full-ball hit along the line of centres.
    const b = bodies().filter((x) => x.id === "white" || x.id === "red1");
    const white = b.find((x) => x.id === "white")!;
    const apex = b.find((x) => x.id === "red1")!;
    const aim = Math.atan2(apex.position.y - white.position.y, apex.position.x - white.position.x);
    const p = predictShot(snooker, table, b, snookerShot({ aim, speed: 3, sideOffset: 0, vertOffset: 0 }));
    expect(p.hitId).toBe("red1");
    expect(p.ghost).not.toBeNull();
    expect(Math.hypot(p.ghost!.x - apex.position.x, p.ghost!.y - apex.position.y)).toBeCloseTo(2 * 0.02625, 3);
    const dir = Math.atan2(p.hitPath![1].y - p.hitPath![0].y, p.hitPath![1].x - p.hitPath![0].x);
    expect(Math.abs(dir - aim)).toBeLessThan(0.1);
    expect(p.path.length).toBeGreaterThan(2);
  });

  it("sees the brown first when shooting straight up the table from the D", () => {
    const p = predictShot(snooker, table, bodies(), snookerShot({ aim: UP, speed: 3, sideOffset: 0, vertOffset: 0 }));
    expect(p.hitId).toBe("brown");
  });

  it("reports no contact when the shot misses every ball", () => {
    const p = predictShot(snooker, table, bodies(), snookerShot({ aim: Math.PI, speed: 1, sideOffset: 0, vertOffset: 0 }));
    expect(p.hitId).toBeNull();
    expect(p.ghost).toBeNull();
  });
});

describe("aiming guides", () => {
  const R = 0.02625;
  const ball = (id: string, x: number, y: number) => snooker.createBody(id, x, y);
  const plain = (aim: number, speed: number) => snookerShot({ aim, speed, sideOffset: 0, vertOffset: 0 });
  const guides = { angles: true, cushions: true, reach: 1 };
  const inside = (pts: { x: number; y: number }[]) =>
    pts.every((p) => p.x >= -0.2 && p.x <= table.width + 0.2 && p.y >= -0.2 && p.y <= table.length + 0.2);

  it("keeps the lines after contact on the table, bending at the cushions", () => {
    for (let i = 0; i < 24; i++) {
      const aim = UP + (i - 12) * 0.03;
      const p = predictShot(snooker, table, bodies(), plain(aim, 6), undefined, guides);
      for (const line of [p.path, p.hitPath ?? [], p.cuePath ?? []]) expect(inside(line)).toBe(true);
    }
  });

  it("carries a potted ball's line on into the pocket", () => {
    const b = [ball("white", table.width - 0.9, table.length / 2), ball("red1", table.width - 0.4, table.length / 2)];
    const p = predictShot(snooker, table, b, plain(0, 3), undefined, guides);
    const end = p.hitPath![p.hitPath!.length - 1];
    const pocket = table.pockets.reduce((a, c) => (Math.hypot(c.position.x - end.x, c.position.y - end.y) < Math.hypot(a.position.x - end.x, a.position.y - end.y) ? c : a));
    expect(Math.hypot(pocket.position.x - end.x, pocket.position.y - end.y)).toBeLessThan(1e-9);
  });

  it("measures a cut against the line the cue ball arrived on", () => {
    const red = { x: 0.9, y: 2 };
    const ghost = { x: red.x, y: red.y - 2 * R };
    const cut = (30 * Math.PI) / 180;
    const white = { x: ghost.x - 0.6 * Math.sin(cut), y: ghost.y - 0.6 * Math.cos(cut) };
    const aim = Math.atan2(ghost.y - white.y, ghost.x - white.x);
    const p = predictShot(snooker, table, [ball("white", white.x, white.y), ball("red1", red.x, red.y)], plain(aim, 2), undefined, guides);
    const label = p.marks.find((m) => m.label.startsWith("Cut"))!.label;
    expect(Math.abs(Number.parseFloat(label.slice(4)) - 30)).toBeLessThan(0.2);
  });

  it("measures the angles in and out of a cushion from its perpendicular", () => {
    const aim = Math.PI / 4;
    const p = predictShot(snooker, table, [ball("white", table.width - 0.6, 1)], plain(aim, 2), undefined, guides);
    const [inward, outward] = p.marks[0].label.split("→").map((s) => Number.parseFloat(s));
    expect(inward).toBeGreaterThan(40);
    expect(inward).toBeLessThan(50);
    expect(outward).toBeGreaterThan(15);
    expect(outward).toBeLessThan(75);
  });

  it("moves readouts off each other, and leaves separate ones alone", () => {
    const mark = (x: number, y: number) => ({ line: "aim" as const, lines: [], label: "1°", labelAt: { x, y } });
    const out = separateLabels([mark(0.2, 1), mark(0.2, 1.05), mark(1.5, 3)], 0.09, table);
    expect(Math.abs(out[0].labelAt.x - out[1].labelAt.x)).toBeGreaterThanOrEqual(0.09 * 0.75);
    expect(out[2].labelAt).toEqual({ x: 1.5, y: 3 });
  });

  it("hides the cut angle for flicked discs", () => {
    const board = carrom.createTable();
    const p = predictShot(carrom, board, carrom.createInitialBodies(board), carrom.input.buildShot({ aim: UP, power: 0.5, spinX: 0, spinY: 0 }), undefined, guides);
    expect(p.hitId).not.toBeNull();
    expect(p.marks.some((m) => m.label.startsWith("Cut"))).toBe(false);
  });

  it("draws no measurements when angles are off", () => {
    const p = predictShot(snooker, table, [ball("white", table.width - 0.6, 1)], plain(Math.PI / 4, 2), undefined, { ...guides, angles: false });
    expect(p.marks).toEqual([]);
  });

  it("stops at the first cushion when following cushions is off", () => {
    const at = [ball("white", table.width - 0.6, 1)];
    const on = predictShot(snooker, table, at, plain(Math.PI / 4, 3), undefined, guides);
    const off = predictShot(snooker, table, at, plain(Math.PI / 4, 3), undefined, { ...guides, cushions: false });
    const lastY = (pts: { y: number }[]) => pts[pts.length - 1].y;
    expect(off.path[off.path.length - 1].x).toBeCloseTo(table.width - R, 2);
    expect(lastY(on.path)).toBeGreaterThan(lastY(off.path) + 0.3);
  });

  it("extends the same line by the reach, and marks where the shot really stops", () => {
    const at = [ball("white", 0.9, 0.5)];
    const shot = plain(UP, 0.4);
    const length = (pts: { x: number; y: number }[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
    const real = predictShot(snooker, table, at, shot, undefined, guides);
    const far = predictShot(snooker, table, at, shot, undefined, { ...guides, reach: 2 });
    expect(length(far.path) / length(real.path)).toBeCloseTo(2, 2);
    expect(real.marks).toEqual([]);
    expect(far.marks.map((m) => m.label)).toEqual(["Stops"]);
  });
});
