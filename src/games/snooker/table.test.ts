import { describe, expect, it } from "vitest";
import { SNOOKER, createSnookerTable } from "./table";

describe("snooker table", () => {
  it("uses real 12 ft proportions, not pool's 2:1 table", () => {
    const t = createSnookerTable();
    expect(t.length).toBeCloseTo(3.569, 3);
    expect(t.width).toBeCloseTo(1.778, 3);
    expect(t.length / t.width).toBeCloseTo(2.007, 2);
  });
  it("has six pockets, six cushion faces and twelve jaw tips", () => {
    const t = createSnookerTable();
    expect(t.pockets).toHaveLength(6);
    expect(t.cushions).toHaveLength(6);
    expect(t.knuckles).toHaveLength(12);
  });

  it("measures each pocket mouth between its two cushion tips", () => {
    const t = createSnookerTable();
    const width = (id: string) => {
      const m = t.pockets.find((p) => p.id === id)!.mouth!;
      return Math.hypot(m.a.x - m.b.x, m.a.y - m.b.y);
    };
    expect(width("tr")).toBeCloseTo(SNOOKER.cornerPocketMouth, 9);
    expect(width("ml")).toBeCloseTo(SNOOKER.middlePocketMouth, 9);
  });
  it("allows pocket size overrides", () => {
    const t = createSnookerTable({ cornerPocketMouth: 0.1 });
    expect(t.pockets[0].radius).toBeCloseTo(0.05);
    expect(SNOOKER.cornerPocketMouth).toBe(0.089);
  });
});
