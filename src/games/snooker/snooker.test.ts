import { describe, expect, it } from "vitest";
import { slipVelocity } from "@/core/sim/motion";
import { snooker, snookerShot } from "./index";
import { colourSpots, startingBodies } from "./layout";
import { DEFAULT_CUE, strikeBall } from "./strike";
import { SNOOKER, createSnookerTable } from "./table";

const R = SNOOKER.ballRadius;
const table = createSnookerTable();
const white = () => startingBodies(table).find((b) => b.id === "white")!;
const UP = Math.PI / 2; // aim along +y, up the table

describe("cue strike", () => {
  it("a centre hit gives the cue ball (1+e)V / (1 + m/M) with no spin", () => {
    const V = 3;
    const { ball, clamped } = strikeBall(white(), { aim: UP, speed: V, sideOffset: 0, vertOffset: 0 });
    const expected = ((1 + DEFAULT_CUE.tipRestitution) * V) / (1 + SNOOKER.ballMass / DEFAULT_CUE.cueMass);
    expect(clamped).toBe(false);
    expect(ball.velocity.y).toBeCloseTo(expected, 9);
    expect(ball.velocity.x).toBeCloseTo(0, 9);
    expect(Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y, ball.angularVelocity.z)).toBeCloseTo(0, 9);
  });

  it("a high hit gives topspin (follow) and a low hit gives backspin (draw)", () => {
    const top = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0, vertOffset: 0.4 }).ball;
    const low = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0, vertOffset: -0.4 }).ball;
    // Rolling forward along +y needs omega_x = -v/R, so topspin is negative.
    expect(top.angularVelocity.x).toBeLessThan(0);
    expect(low.angularVelocity.x).toBeGreaterThan(0);
  });

  it("a level cue hit 0.4R above centre (the centre of percussion) launches the ball rolling with zero slip", () => {
    const { ball } = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0, vertOffset: 0.4 });
    const u = slipVelocity(ball);
    expect(Math.hypot(u.x, u.y)).toBeLessThan(1e-9);
    expect(ball.state).toBe("rolling");
  });

  it("a centre hit launches the ball sliding, and a high hit above 0.4R launches it with over-spin", () => {
    expect(strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0, vertOffset: 0 }).ball.state).toBe("sliding");
    const hi = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0, vertOffset: 0.5 }).ball;
    const u = slipVelocity(hi);
    expect(u.y).toBeLessThan(0);
  });

  it("an offset strike is weaker than a centre strike", () => {
    const c = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0, vertOffset: 0 }).ball;
    const o = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0.5, vertOffset: 0 }).ball;
    expect(Math.hypot(o.velocity.x, o.velocity.y)).toBeLessThan(Math.hypot(c.velocity.x, c.velocity.y));
  });

  it("right-hand side gives anticlockwise spin and squirts the ball to the left", () => {
    const r = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0.4, vertOffset: 0 }).ball;
    expect(r.angularVelocity.z).toBeGreaterThan(0);
    expect(r.velocity.x).toBeLessThan(0);
    const l = strikeBall(white(), { aim: UP, speed: 3, sideOffset: -0.4, vertOffset: 0 }).ball;
    expect(l.angularVelocity.z).toBeLessThan(0);
    expect(l.velocity.x).toBeGreaterThan(0);
  });

  it("clamps offsets beyond 0.5R (the miscue limit) onto the limit circle", () => {
    const { ball, clamped } = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0.9, vertOffset: 0.9 });
    const limit = strikeBall(white(), { aim: UP, speed: 3, sideOffset: 0.5 * Math.SQRT1_2, vertOffset: 0.5 * Math.SQRT1_2 }).ball;
    expect(clamped).toBe(true);
    expect(ball.velocity.x).toBeCloseTo(limit.velocity.x, 9);
    expect(ball.angularVelocity.z).toBeCloseTo(limit.angularVelocity.z, 9);
  });
});

describe("frame layout", () => {
  const bodies = startingBodies(table);

  it("has the white, fifteen reds and six colours", () => {
    expect(bodies).toHaveLength(22);
    expect(bodies.filter((b) => b.id.startsWith("red"))).toHaveLength(15);
  });

  it("starts with no ball touching another and every ball on the cloth", () => {
    for (const a of bodies) {
      expect(a.position.x).toBeGreaterThan(R);
      expect(a.position.x).toBeLessThan(table.width - R);
      expect(a.position.y).toBeGreaterThan(R);
      expect(a.position.y).toBeLessThan(table.length - R);
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const d = Math.hypot(bodies[i].position.x - bodies[j].position.x, bodies[i].position.y - bodies[j].position.y);
        expect(d, `${bodies[i].id} / ${bodies[j].id}`).toBeGreaterThan(2 * R);
      }
    }
  });

  it("puts colours on the official spots", () => {
    const s = colourSpots(table);
    expect(s.black.y).toBeCloseTo(table.length - 0.324, 6);
    expect(s.brown.y).toBeCloseTo(0.737, 6);
    expect(s.blue.y).toBeCloseTo(table.length / 2, 6);
    expect(s.yellow.x - s.green.x).toBeCloseTo(2 * 0.292, 6);
    expect(s.pink.y).toBeCloseTo((s.blue.y + table.length) / 2, 6);
  });

  it("racks the reds with the apex just above the pink, not touching it", () => {
    const pink = colourSpots(table).pink;
    const apex = bodies.find((b) => b.id === "red1")!;
    const gap = Math.hypot(apex.position.x - pink.x, apex.position.y - pink.y) - 2 * R;
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(0.002);
  });
});

describe("snooker game", () => {
  it("runs a break-off shot to rest with sane, finite results", () => {
    const g = snooker;
    const t = g.createTable();
    const res = g.simulate(t, g.createInitialBodies(t), snookerShot({ aim: UP, speed: 4, sideOffset: 0, vertOffset: 0 }));
    expect(res.events.some((e) => e.type === "collision")).toBe(true);
    for (const b of res.final) {
      expect(Number.isFinite(b.position.x) && Number.isFinite(b.position.y)).toBe(true);
      expect(["stationary", "pocketed"]).toContain(b.state);
      if (b.state !== "pocketed") {
        expect(b.position.x).toBeGreaterThan(0);
        expect(b.position.x).toBeLessThan(t.width);
        expect(b.position.y).toBeGreaterThan(0);
        expect(b.position.y).toBeLessThan(t.length);
      }
    }
  });

  it("gives identical event logs for identical shots", () => {
    const g = snooker;
    const t = g.createTable();
    const shot = snookerShot({ aim: UP + 0.01, speed: 3, sideOffset: 0.2, vertOffset: 0.1 });
    const a = g.simulate(t, g.createInitialBodies(t), shot);
    const b = g.simulate(t, g.createInitialBodies(t), shot);
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
  });
});
