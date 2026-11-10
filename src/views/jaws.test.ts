import { describe, expect, it } from "vitest";
import type { Table } from "@/core/types";
import { createCarromTable } from "@/games/carrom/table";
import { createSnookerTable } from "@/games/snooker/table";
import { cushionOutline, pocketOpening, railOpening, type PlanPoint } from "./jaws";

const tables: Array<[string, Table, number]> = [
  ["snooker", createSnookerTable(), 0.05],
  ["carrom", createCarromTable(), 0.018],
];

/** The largest change of direction, in degrees, between consecutive edges of a closed outline. */
function sharpestTurn(points: PlanPoint[]) {
  let worst = 0;
  points.forEach((p, i) => {
    const a = points[(i + points.length - 1) % points.length];
    const b = points[(i + 1) % points.length];
    const turn = Math.atan2((p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x), (p.x - a.x) * (b.x - p.x) + (p.y - a.y) * (b.y - p.y));
    worst = Math.max(worst, Math.abs((turn * 180) / Math.PI));
  });
  return worst;
}

describe.each(tables)("pocket jaws on %s", (_name, table, band) => {
  it("gives the rail a smooth edge round every pocket, with no sharp points", () => {
    expect(sharpestTurn(railOpening(table, band))).toBeLessThan(35);
  });

  it("cuts a notch into the rail at every pocket", () => {
    const outline = railOpening(table, band);
    for (const p of table.pockets) {
      const { centre, radius } = pocketOpening(p, table, band);
      const closest = Math.min(...outline.map((q) => Math.hypot(q.x - centre.x, q.y - centre.y)));
      expect(closest).toBeGreaterThanOrEqual(radius);
      expect(closest).toBeLessThan(radius + band);
    }
  });

  it("keeps each cushion's nose on the physics line and rounds off its ends", () => {
    for (const c of table.cushions) {
      const outline = cushionOutline(c, table, band);
      const offLine = (p: PlanPoint) => {
        const len = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y);
        return Math.abs(((p.x - c.a.x) * (c.b.y - c.a.y) - (p.y - c.a.y) * (c.b.x - c.a.x)) / len);
      };
      const onLine = outline.filter((p) => offLine(p) < 1e-9);
      expect(onLine.length).toBeGreaterThanOrEqual(2);
      // Rounded: no outline point sits on the jaw tip itself.
      for (const tip of [c.a, c.b]) expect(Math.min(...outline.map((p) => Math.hypot(p.x - tip.x, p.y - tip.y)))).toBeGreaterThan(band * 0.1);
    }
  });
});
