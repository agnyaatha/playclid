import { describe, expect, it } from "vitest";
import { snooker } from "@/games/snooker";
import { snookerLessons } from "@/games/snooker/lessons";
import type { DrillLesson } from "./schema";
import { aidsForAttempt, buildLessonBodies, evaluateShot, starsFor, validateLesson } from "./logic";
import { findSolution } from "./solver";

const table = snooker.createTable();
const drills = snookerLessons.filter((l): l is DrillLesson => l.kind === "drill");

describe("aid fading", () => {
  const lesson = { ...drills[0], aids: ["aimLine", "ghostBall", "prediction"], practiceAttempts: 6, testAttempts: 4 } as DrillLesson;

  it("drops one aid at a time, last-listed first, across the practice attempts", () => {
    const counts = [0, 1, 2, 3, 4, 5].map((i) => aidsForAttempt(lesson, i).length);
    expect(counts).toEqual([3, 3, 2, 2, 1, 1]);
    expect(aidsForAttempt(lesson, 4)).toEqual(["aimLine"]);
  });

  it("offers no aids on test attempts", () => {
    for (let i = 6; i < 10; i++) expect(aidsForAttempt(lesson, i)).toEqual([]);
  });
});

describe("stars", () => {
  const l = { ...drills[0], stars: [4, 6, 8] } as DrillLesson;
  it("awards stars at the thresholds", () => {
    expect([0, 3, 4, 5, 6, 7, 8, 10].map((n) => starsFor(l, n))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe("curriculum content", () => {
  it("has a watch lesson for each of the eleven modules and drills in modules 3, 4 and 8", () => {
    const watch = snookerLessons.filter((l) => l.kind === "watch");
    expect(watch).toHaveLength(11);
    expect(new Set(drills.map((d) => d.module))).toEqual(new Set(["3", "4", "8"]));
  });

  it("has unique lesson ids", () => {
    const ids = snookerLessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is ordered by module then order", () => {
    for (let i = 1; i < snookerLessons.length; i++) {
      const a = snookerLessons[i - 1];
      const b = snookerLessons[i];
      expect(Number(a.module) * 1000 + a.order).toBeLessThanOrEqual(Number(b.module) * 1000 + b.order);
    }
  });

  it.each(snookerLessons.map((l) => [l.id, l] as const))("%s passes validation", (_id, lesson) => {
    expect(validateLesson(snooker, table, lesson)).toEqual([]);
  });

  it("links only to https youtube urls", () => {
    for (const l of snookerLessons) {
      if (l.kind !== "watch") continue;
      for (const v of l.videos) expect(v.url).toMatch(/^https:\/\/(www\.youtube\.com|youtu\.be)\//);
    }
  });
});

describe("drills are achievable", () => {
  it.each(drills.map((l) => [l.id, l] as const))("%s has a shot that passes", (_id, lesson) => {
    const sol = findSolution(snooker, table, lesson);
    expect(sol, "no passing shot found").not.toBeNull();
    expect(evaluateShot(lesson, sol!.result, snooker.input.strikerId).success).toBe(true);
  });
});

describe("shot evaluation", () => {
  const lesson = drills.find((d) => d.id === "m3-straight-short")!;
  const bodies = buildLessonBodies(snooker, table, lesson);

  it("fails a shot that misses everything, with a reason", () => {
    const res = snooker.simulate(table, bodies, snooker.input.buildShot({ aim: Math.PI, power: 0.3, spinX: 0, spinY: 0 }));
    const out = evaluateShot(lesson, res, "white");
    expect(out.success).toBe(false);
    expect(out.reasons.join(" ")).toMatch(/not potted/);
  });

  it("reports the distance outside the zone for a zone drill", () => {
    const stun = drills.find((d) => d.id === "m4-stun")!;
    const b = buildLessonBodies(snooker, table, stun);
    const res = snooker.simulate(table, b, snooker.input.buildShot({ aim: Math.PI / 2, power: 0.2, spinX: 0, spinY: 0 }));
    const out = evaluateShot(stun, res, "white");
    expect(out.zoneDistance).not.toBeNull();
    expect(out.success).toBe(false);
  });
});

import { poolLessons } from "@/games/pool/lessons";
import { pool } from "@/games/pool";

describe("pool curriculum", () => {
  const poolTable = pool.createTable();
  const poolDrills = poolLessons.filter((l): l is DrillLesson => l.kind === "drill");

  it.each(poolLessons.map((l) => [l.id, l] as const))("%s passes validation", (_id, lesson) => {
    expect(validateLesson(pool, poolTable, lesson)).toEqual([]);
  });

  it.each(poolDrills.map((l) => [l.id, l] as const))("%s has a shot that passes", (_id, lesson) => {
    const sol = findSolution(pool, poolTable, lesson);
    expect(sol, "no passing shot found").not.toBeNull();
  });
});

import type { BreakLesson } from "./schema";
import { SKILLS, suggestShot } from "../ai/advisor";
import { snookerRules } from "@/games/snooker/rules";

describe("break drills", () => {
  const breaks = snookerLessons.filter((l): l is BreakLesson => l.kind === "break");

  it("exist in module 5 and validate", () => {
    expect(breaks.map((b) => b.id)).toEqual(["m5-clearance", "m5-red-black"]);
    for (const b of breaks) expect(validateLesson(snooker, table, b)).toEqual([]);
  });

  it("rejects bad star thresholds and negative reds", () => {
    const bad = { ...breaks[0], stars: [5, 3, 9] as [number, number, number], redsLeft: -1 };
    expect(validateLesson(snooker, table, bad).join(" ")).toMatch(/ascending/);
    expect(validateLesson(snooker, table, bad).join(" ")).toMatch(/redsLeft/);
  });

  it.each(breaks.map((b) => [b.id, b] as const))("%s starts with a pot available for the first ball on", (_id, lesson) => {
    const bodies = buildLessonBodies(snooker, table, lesson);
    const frame = snookerRules.newFrame({ redsLeft: lesson.redsLeft });
    const targets = snookerRules.targets!(frame, bodies);
    expect(targets.length).toBeGreaterThan(0);
    const s = suggestShot(snooker, table, { bodies, targets, skill: SKILLS.expert, seed: 3 });
    expect(s).not.toBeNull();
  }, 60_000);
});
