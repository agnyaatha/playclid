import { describe, expect, it } from "vitest";
import { angleDelta } from "./useShotDemo";

describe("the demo's aim sweep", () => {
  it("turns the short way round", () => {
    expect(angleDelta(0, 1)).toBeCloseTo(1, 9);
    expect(angleDelta(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.2, 9);
    expect(angleDelta(2 * Math.PI - 0.1, 0.1)).toBeCloseTo(0.2, 9);
  });

  it("never turns more than half a circle", () => {
    for (const [a, b] of [[0, 3.5], [-3, 3], [6, -6], [12, 0.5]]) expect(Math.abs(angleDelta(a, b))).toBeLessThanOrEqual(Math.PI + 1e-9);
  });
});
