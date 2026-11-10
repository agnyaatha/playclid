import { describe, expect, it } from "vitest";
import type { Body } from "../types";
import { applyTransition, classify, evolve, slipVelocity, timeToTransition, type ClothParams } from "./motion";

const P: ClothParams = { muSliding: 0.212, muRolling: 0.0128, muSpinning: 0.01, g: 9.81 };
const R = 0.02625;

const ball = (o: Partial<Body> = {}): Body => ({
  id: "w",
  radius: R,
  mass: 0.1406,
  state: "sliding",
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
  ...o,
});

describe("cloth motion", () => {
  it("centre-ball hit: slides for 2v0/(7 mu g), then rolls at 5/7 of v0", () => {
    const v0 = 2;
    const b = ball({ velocity: { x: 0, y: v0, z: 0 } });
    const { dt, to } = timeToTransition(b, P);
    expect(to).toBe("rolling");
    expect(dt).toBeCloseTo((2 * v0) / (7 * P.muSliding * P.g), 9);
    const r = applyTransition(b, dt, P);
    expect(r.state).toBe("rolling");
    expect(r.velocity.y).toBeCloseTo((5 / 7) * v0, 9);
    const u = slipVelocity(r);
    expect(Math.hypot(u.x, u.y)).toBeLessThan(1e-9);
  });

  it("sliding position matches the closed form", () => {
    const v0 = 2;
    const b = ball({ velocity: { x: 0, y: v0, z: 0 } });
    const t = 0.3;
    const r = evolve(b, t, P);
    const a = P.muSliding * P.g;
    expect(r.position.y).toBeCloseTo(v0 * t - 0.5 * a * t * t, 9);
  });

  it("draw shot (backspin) reverses direction", () => {
    const b = ball({ velocity: { x: 0, y: 1, z: 0 }, angularVelocity: { x: 150, y: 0, z: 0 } });
    const r = applyTransition(b, timeToTransition(b, P).dt, P);
    expect(r.velocity.y).toBeLessThan(0);
  });

  it("follow shot (topspin) speeds the ball up to rolling", () => {
    const b = ball({ velocity: { x: 0, y: 1, z: 0 }, angularVelocity: { x: -150, y: 0, z: 0 } });
    const r = applyTransition(b, timeToTransition(b, P).dt, P);
    expect(r.velocity.y).toBeGreaterThan(1);
  });

  it("rolling ball stops after v/(mu_r g) and travels v^2/(2 mu_r g)", () => {
    const v = 1;
    const b = ball({ state: "rolling", velocity: { x: v, y: 0, z: 0 }, angularVelocity: { x: 0, y: v / R, z: 0 } });
    const { dt, to } = timeToTransition(b, P);
    expect(to).toBe("stationary");
    expect(dt).toBeCloseTo(v / (P.muRolling * P.g), 9);
    const r = applyTransition(b, dt, P);
    expect(r.state).toBe("stationary");
    expect(r.position.x).toBeCloseTo((v * v) / (2 * P.muRolling * P.g), 9);
  });

  it("sidespin decays linearly then the ball stops spinning", () => {
    const b = ball({ state: "spinning", angularVelocity: { x: 0, y: 0, z: 40 } });
    const { dt, to } = timeToTransition(b, P);
    expect(to).toBe("stationary");
    expect(applyTransition(b, dt, P).angularVelocity.z).toBe(0);
  });

  it("classifies states from velocity and spin", () => {
    expect(classify(ball({ velocity: { x: 1, y: 0, z: 0 } }))).toBe("sliding");
    expect(
      classify(ball({ state: "rolling", velocity: { x: 1, y: 0, z: 0 }, angularVelocity: { x: 0, y: 1 / R, z: 0 } })),
    ).toBe("rolling");
    expect(classify(ball())).toBe("stationary");
  });
});
