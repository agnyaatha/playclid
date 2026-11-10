import { describe, expect, it } from "vitest";
import { snooker } from "@/games/snooker";
import { SNOOKER, createSnookerTable } from "@/games/snooker/table";
import { SNOOKER_PARAMS as P } from "@/games/snooker/params";
import type { Body } from "../types";
import { resolveBallBall, resolveCushion } from "./collisions";
import { reclassify } from "./motion";
import { simulateEvents } from "./simulate";

const R = SNOOKER.ballRadius;
const table = createSnookerTable();

const ball = (id: string, x: number, y: number, o: Partial<Body> = {}): Body =>
  reclassify({
    id,
    radius: R,
    mass: SNOOKER.ballMass,
    state: "stationary",
    position: { x, y, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...o,
  });

/** A ball struck at its centre rolling toward +y: spin matches velocity. */
const rolling = (id: string, x: number, y: number, v: number): Body =>
  ball(id, x, y, { velocity: { x: 0, y: v, z: 0 }, angularVelocity: { x: -v / R, y: 0, z: 0 } });

const angleBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (Math.acos((a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))) * 180) / Math.PI;

describe("ball-ball collisions", () => {
  it("conserves linear momentum", () => {
    const n = { x: Math.sin(Math.PI / 6), y: Math.cos(Math.PI / 6) };
    const a = ball("a", 0, 0, { velocity: { x: 0, y: 2, z: 0 } });
    const b = ball("b", n.x * 2 * R, n.y * 2 * R);
    const [a2, b2] = resolveBallBall(a, b, P);
    expect(a2.velocity.x + b2.velocity.x).toBeCloseTo(a.velocity.x, 9);
    expect(a2.velocity.y + b2.velocity.y).toBeCloseTo(a.velocity.y, 9);
  });

  it("90 degree rule: stun half-ball cut parts at roughly 83 degrees (inelasticity + throw)", () => {
    const n = { x: Math.sin(Math.PI / 6), y: Math.cos(Math.PI / 6) };
    const a = ball("a", 0, 0, { velocity: { x: 0, y: 2, z: 0 } });
    const b = ball("b", n.x * 2 * R, n.y * 2 * R);
    const [a2, b2] = resolveBallBall(a, b, P);
    const angle = angleBetween(a2.velocity, b2.velocity);
    expect(angle).toBeGreaterThan(80);
    expect(angle).toBeLessThan(88);
  });

  it("separating balls are left untouched", () => {
    const a = ball("a", 0, 0, { velocity: { x: 0, y: -1, z: 0 } });
    const b = ball("b", 0, 2 * R);
    const [a2, b2] = resolveBallBall(a, b, P);
    expect(a2).toBe(a);
    expect(b2).toBe(b);
  });
});

describe("cushions", () => {
  const n = { x: 0, y: -1, z: 0 };
  /** A ball rolling into the top cushion at `deg` from the normal, with sidespin as a fraction of v/R. */
  const into = (v: number, deg: number, side = 0) => {
    const a = (deg * Math.PI) / 180;
    const vx = v * Math.sin(a);
    const vy = v * Math.cos(a);
    return ball("c", 0.9, 3.2, { velocity: { x: vx, y: vy, z: 0 }, angularVelocity: { x: -vy / R, y: vx / R, z: (side * v) / R } });
  };
  const exitAngle = (b: Body) => (Math.atan2(b.velocity.x, -b.velocity.y) * 180) / Math.PI;

  it("head-on rebound matches the rebound measured on a Riley table (about 0.82 of the incoming speed)", () => {
    const r = resolveCushion(into(1, 0), n, P);
    expect(-r.velocity.y).toBeGreaterThan(0.78);
    expect(-r.velocity.y).toBeLessThan(0.86);
    expect(r.velocity.x).toBeCloseTo(0, 9);
  });

  it("the rebound ratio does not depend on speed for a rigid cushion", () => {
    const ratio = (v: number) => -resolveCushion(into(v, 0), n, P).velocity.y / v;
    expect(ratio(2)).toBeCloseTo(ratio(0.5), 6);
  });

  it("does not mirror: a rolling ball comes off a cushion closer to the normal than it went in", () => {
    const out = exitAngle(resolveCushion(into(1, 45), n, P));
    expect(out).toBeGreaterThan(25);
    expect(out).toBeLessThan(44);
  });

  it("running side widens the exit along the rail and check side narrows it", () => {
    const plain = exitAngle(resolveCushion(into(1, 45), n, P));
    expect(exitAngle(resolveCushion(into(1, 45, 0.5), n, P))).toBeGreaterThan(plain);
    expect(exitAngle(resolveCushion(into(1, 45, -0.5), n, P))).toBeLessThan(plain);
  });

  it("is mirror-symmetric: the same shot on the other side gives the mirrored result", () => {
    const left = resolveCushion(into(1, 30), n, P);
    const right = resolveCushion(into(1, -30), n, P);
    expect(right.velocity.x).toBeCloseTo(-left.velocity.x, 9);
    expect(right.velocity.y).toBeCloseTo(left.velocity.y, 9);
  });

  it("always leaves the cushion, even from a crawl", () => {
    expect(resolveCushion(into(1e-6, 0), n, P).velocity.y).toBeLessThan(0);
  });

  it("event loop hits the top cushion and rebounds", () => {
    const res = simulateEvents(table, [rolling("c", 0.9, 3.2, 1)], P);
    const hit = res.events.findIndex((e) => e.type === "cushion");
    expect(hit).toBeGreaterThanOrEqual(0);
    expect((res.events[hit] as { cushion: string }).cushion).toBe("top");
    expect(res.keyframes[hit][0].velocity.y).toBeLessThan(0);
  });
});

describe("pockets", () => {
  it("pockets a ball rolled into the corner", () => {
    const b = ball("o", 0.3, 0.3, { velocity: { x: -0.7, y: -0.7, z: 0 } });
    const res = simulateEvents(table, [b], P);
    expect(res.events.some((e) => e.type === "pocket" && e.pocket === "bl")).toBe(true);
    expect(res.final[0].state).toBe("pocketed");
  });
});

describe("pocket jaws", () => {
  it("pots a ball that slides into a corner at a shallow angle (no invisible cushion across the mouth)", () => {
    // 20 degrees to the top cushion, aimed at the top-right corner.
    const b = ball("o", 0.889, 3.245, { velocity: { x: 0.94, y: 0.342, z: 0 } });
    const res = simulateEvents(table, [b], P);
    expect(res.events.some((e) => e.type === "pocket" && e.pocket === "tr")).toBe(true);
  });

  it("does not pot a ball rolling along the cushion past a middle pocket", () => {
    const b = ball("o", R, 1.2, { velocity: { x: 0, y: 1, z: 0 } });
    const res = simulateEvents(table, [b], P);
    expect(res.events.some((e) => e.type === "pocket")).toBe(false);
  });

  it("bounces a ball that hits a jaw tip instead of potting it", () => {
    const tip = table.pockets.find((p) => p.id === "mr")!.mouth!.b;
    // Inside the mouth but offset so the ball's edge meets the upper tip before its centre reaches the mouth.
    const b = ball("o", 1.2, tip.y - R * 0.9, { velocity: { x: 1.5, y: 0, z: 0 } });
    const res = simulateEvents(table, [b], P);
    const bounce = res.events.findIndex((e) => e.type === "cushion" && e.cushion === "knuckle");
    const pot = res.events.findIndex((e) => e.type === "pocket");
    expect(bounce).toBeGreaterThanOrEqual(0);
    // The first thing to happen is the bounce; any later pot comes only after the ball has been deflected.
    expect(pot === -1 || pot > bounce).toBe(true);
  });

  it("pots a ball driven straight through the middle of a middle pocket", () => {
    const b = ball("o", 1.2, table.length / 2, { velocity: { x: 1.2, y: 0, z: 0 } });
    const res = simulateEvents(table, [b], P);
    expect(res.events.some((e) => e.type === "pocket" && e.pocket === "mr")).toBe(true);
  });
});

describe("full shots", () => {
  it("straight stun shot: the cue ball stops almost dead at the contact point", () => {
    const gap = 0.002;
    const cue = ball("w", 0.9, 1.0, { velocity: { x: 0, y: 1, z: 0 } });
    const ob = ball("r", 0.9, 1.0 + 2 * R + gap);
    const res = simulateEvents(table, [cue, ob], P);
    expect(res.events.some((e) => e.type === "collision")).toBe(true);
    const w = res.final[0];
    expect(Math.abs(w.position.y - (1.0 + gap))).toBeLessThan(0.02);
    expect(Math.abs(w.position.x - 0.9)).toBeLessThan(1e-9);
    expect(res.final[1].position.y).toBeGreaterThan(1.5);
  });

  it("30 degree rule: a rolling cue ball after a half-ball cut heads off about 30 degrees from its original line", () => {
    const n = { x: Math.sin(Math.PI / 6), y: Math.cos(Math.PI / 6) };
    const startY = 1.0;
    const gap = 0.05;
    const cue = rolling("w", 0.9, startY, 0.8);
    const ob = ball("r", 0.9 + n.x * 2 * R, startY + gap + n.y * 2 * R);
    const res = simulateEvents(table, [cue, ob], P);
    const w = res.final[0];
    const contact = { x: 0.9, y: startY + gap };
    const angle = (Math.atan2(contact.x - w.position.x, w.position.y - contact.y) * 180) / Math.PI;
    expect(angle).toBeGreaterThan(20);
    expect(angle).toBeLessThan(40);
  });

  it("is deterministic", () => {
    const setup = () => [ball("w", 0.9, 1, { velocity: { x: 0.3, y: 1.4, z: 0 } }), ball("r", 0.95, 1.8)];
    const a = simulateEvents(table, setup(), P);
    const b = simulateEvents(table, setup(), P);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("every shot terminates with all balls at rest or pocketed", () => {
    const res = simulateEvents(table, [ball("w", 0.9, 1, { velocity: { x: 0.5, y: 3, z: 0 } }), ball("r", 0.95, 2.2)], P);
    expect(res.final.every((b) => b.state === "stationary" || b.state === "pocketed")).toBe(true);
  });
});

describe("performance guard", () => {
  it("simulates a full-table break-off well inside a frame budget for interactivity", () => {
    const start = snooker.createInitialBodies(table);
    const shotInput = snooker.input.buildShot({ aim: Math.PI / 2 + 0.02, power: 0.8, spinX: 0, spinY: 0 });
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) snooker.simulate(table, start, shotInput);
    // Typically ~20 ms each; the bound is generous so slow CI machines do not flake, but catches runaway cascades.
    expect((performance.now() - t0) / 5).toBeLessThan(400);
  });
});
