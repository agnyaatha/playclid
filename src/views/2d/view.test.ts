import { describe, expect, it } from "vitest";
import { stateAt } from "@/core/sim/playback";
import { snooker, snookerShot } from "@/games/snooker";
import { colourSpots } from "@/games/snooker/layout";
import { fitViewport, toScreen, toTable } from "./geometry";
import { predictShot } from "./prediction";

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
    const dir = Math.atan2(p.hitVelocity!.y, p.hitVelocity!.x);
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
