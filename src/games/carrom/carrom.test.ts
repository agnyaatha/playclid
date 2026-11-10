import { describe, expect, it } from "vitest";
import { validateLesson } from "@/core/lessons/logic";
import { findSolution } from "@/core/lessons/solver";
import type { DrillLesson } from "@/core/lessons/schema";
import { carrom } from "./index";
import { carromLessons } from "./lessons";
import { startingBodies } from "./layout";
import { CARROM } from "./table";

const table = carrom.createTable();
const bodies = startingBodies(table);

describe("carrom board", () => {
  it("is a 74 cm square with four corner pockets and four cushions", () => {
    expect(table.width).toBeCloseTo(0.74, 9);
    expect(table.length).toBeCloseTo(0.74, 9);
    expect(table.pockets.map((p) => p.id).sort()).toEqual(["bl", "br", "tl", "tr"]);
    expect(table.cushions).toHaveLength(4);
  });

  it("opens with the queen, nine white coins, nine black coins and the striker, none touching", () => {
    expect(bodies).toHaveLength(20);
    expect(bodies.filter((b) => b.id.startsWith("w"))).toHaveLength(9);
    expect(bodies.filter((b) => b.id.startsWith("b"))).toHaveLength(9);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const d = Math.hypot(bodies[i].position.x - bodies[j].position.x, bodies[i].position.y - bodies[j].position.y);
        expect(d, `${bodies[i].id} / ${bodies[j].id}`).toBeGreaterThan(bodies[i].radius + bodies[j].radius);
      }
    }
  });

  it("puts the striker on its baseline, and slides it along that line with the placement control", () => {
    const s = bodies.find((b) => b.id === "striker")!;
    expect(s.position.y).toBeCloseTo(CARROM.baselineY, 9);
    const moved = carrom.place!(bodies, { aim: 0, power: 0, spinX: 1, spinY: 0 }).find((b) => b.id === "striker")!;
    expect(moved.position.x).toBeGreaterThan(s.position.x);
    expect(moved.position.y).toBe(s.position.y);
  });
});

describe("carrom physics", () => {
  it("a flicked striker slows to a stop with all discs at rest", () => {
    const res = carrom.simulate(table, bodies, carrom.input.buildShot({ aim: Math.PI / 2, power: 0.7, spinX: 0, spinY: 0 }));
    expect(res.events.some((e) => e.type === "collision")).toBe(true);
    expect(res.final.every((b) => b.state === "stationary" || b.state === "pocketed")).toBe(true);
  });

  it("a coin slows at the same rate whichever motion state it is in", () => {
    const { muSliding, muRolling } = carrom.params.cloth;
    expect(muSliding).toBe(muRolling);
  });
});

describe("carrom drills", () => {
  const drills = carromLessons.filter((l): l is DrillLesson => l.kind === "drill");

  it.each(drills.map((l) => [l.id, l] as const))("%s is valid and can be passed", (_id, lesson) => {
    expect(validateLesson(carrom, table, lesson)).toEqual([]);
    expect(findSolution(carrom, table, lesson), "no passing shot found").not.toBeNull();
  });
});
