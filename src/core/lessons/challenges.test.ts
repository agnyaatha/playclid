import { describe, expect, it } from "vitest";
import type { Game } from "@/core/game";
import type { Body, Table } from "@/core/types";
import { carrom } from "@/games/carrom";
import { carromChallenges } from "@/games/carrom/challenges";
import { carromLessons } from "@/games/carrom/lessons";
import { pool } from "@/games/pool";
import { poolChallenges } from "@/games/pool/challenges";
import { snooker } from "@/games/snooker";
import { snookerChallenges } from "@/games/snooker/challenges";
import { challengeStars, clearOfBalls, targetsLeft, type Challenge } from "./challenges";
import { buildLessonBodies, validateLesson } from "./logic";
import type { DrillLesson } from "./schema";
import { findSolution } from "./solver";

const sets: Array<[string, Game, Challenge[]]> = [
  ["snooker", snooker, snookerChallenges],
  ["pool", pool, poolChallenges],
  ["carrom", carrom, carromChallenges],
];

/** A challenge as a one-target drill, so the drill solver can prove a pot exists. */
const asDrill = (c: Challenge, ball: string): DrillLesson => ({
  kind: "drill",
  id: c.id,
  gameId: c.gameId,
  module: "0",
  moduleTitle: "",
  order: 0,
  title: c.title,
  goal: c.goal,
  layout: c.layout,
  aids: [],
  practiceAttempts: 1,
  testAttempts: 0,
  success: { pot: { ball } },
  stars: [1, 1, 1],
});

describe.each(sets)("%s challenges", (_name, game, challenges) => {
  const table = game.createTable();

  it("has nine with unique ids across three tiers", () => {
    expect(challenges).toHaveLength(9);
    expect(new Set(challenges.map((c) => c.id)).size).toBe(9);
    expect([1, 2, 3].map((t) => challenges.filter((c) => c.tier === t).length)).toEqual([3, 3, 3]);
  });

  it.each(challenges.map((c) => [c.title, c] as const))("%s has a sound layout", (_t, c) => {
    expect(validateLesson(game, table, asDrill(c, c.targets[0]))).toEqual([]);
    expect(c.shots).toBeGreaterThanOrEqual(c.targets.length);
  });

  it.each(challenges.map((c) => [c.title, c] as const))("%s can be started with a real pot", (_t, c) => {
    expect(findSolution(game, table, asDrill(c, c.targets[0])), "no opening pot").not.toBeNull();
  }, 60_000);
});

describe("challenge goals", () => {
  it("counts repeated targets instead of listing them twice", () => {
    expect(carromChallenges.find((c) => c.targets.length === 3)!.goal).toMatch(/queen and 2 white coins/);
    expect(snookerChallenges.find((c) => c.targets.length === 3)!.goal).toMatch(/black, pink and blue/);
  });
});

describe("challenge scoring", () => {
  const c = { targets: ["a", "b"], shots: 6 } as Challenge;

  it("gives three stars for one shot per target", () => {
    expect(challengeStars(c, 2, true)).toBe(3);
  });

  it("gives two with at least half the spare shots left, then one", () => {
    expect(challengeStars(c, 4, true)).toBe(2);
    expect(challengeStars(c, 5, true)).toBe(1);
    expect(challengeStars(c, 6, true)).toBe(1);
  });

  it("gives nothing when the targets were not cleared", () => {
    expect(challengeStars(c, 2, false)).toBe(0);
  });
});

describe("challenge position", () => {
  const table: Table = snooker.createTable();
  const ball = (id: string, x: number, y: number): Body => snooker.createBody(id, x, y);

  it("tracks which targets are left", () => {
    const c = { targets: ["black", "pink"] } as Challenge;
    expect(targetsLeft(c, [{ ...ball("black", 1, 1), state: "pocketed" }, ball("pink", 1, 2)])).toEqual(["pink"]);
  });

  it("moves a respotted striker off a ball it landed on, and leaves a clear one alone", () => {
    const bodies = [ball("white", 0.9, 1), ball("red1", 0.9, 1.01)];
    const out = clearOfBalls(bodies, "white", table);
    expect(Math.abs(out[0].position.y - out[1].position.y)).toBeGreaterThanOrEqual(2 * 0.02625);
    const clear = [ball("white", 0.9, 1), ball("red1", 0.9, 2)];
    expect(clearOfBalls(clear, "white", table)[0].position).toEqual(clear[0].position);
  });

  it("builds the same layout every time", () => {
    expect(buildLessonBodies(snooker, table, snookerChallenges[0])).toEqual(buildLessonBodies(snooker, table, snookerChallenges[0]));
  });
});

describe("carrom exercises", () => {
  const table = carrom.createTable();
  const drills = carromLessons.filter((l): l is DrillLesson => l.kind === "drill");

  it.each(drills.map((d) => [d.id, d] as const))("%s has a shot that passes", (_id, lesson) => {
    expect(validateLesson(carrom, table, lesson)).toEqual([]);
    expect(findSolution(carrom, table, lesson), "no passing shot found").not.toBeNull();
  }, 60_000);
});
