import { describe, expect, it } from "vitest";
import type { Game } from "@/core/game";
import { validateLesson } from "@/core/lessons/logic";
import type { DrillLesson, Lesson } from "@/core/lessons/schema";
import { findSolution } from "@/core/lessons/solver";
import type { ShotResult } from "@/core/types";
import { billiards, billiardsLessons } from "./billiards";
import { billiardsRules, judgeShot as judgeBilliards, newFrame as billiardsFrame, scoreShot } from "./billiards/rules";
import { nineball } from "./nineball";
import { nineLessons } from "./nineball/content";
import { judgeShot as judgeNine, newFrame as nineFrame, nineRules } from "./nineball/rules";

const lessonsOf: Array<[string, Game, Lesson[]]> = [
  ["9-ball", nineball, nineLessons],
  ["billiards", billiards, billiardsLessons],
];

describe.each(lessonsOf)("%s exercises", (_n, game, lessons) => {
  const table = game.createTable();
  it.each(lessons.filter((l) => l.kind === "drill").map((l) => [l.id, l] as const))("%s is valid and can be made", (_id, lesson) => {
    expect(validateLesson(game, table, lesson)).toEqual([]);
    expect(findSolution(game, table, lesson as DrillLesson), "no passing shot").not.toBeNull();
  }, 60_000);
});

describe("9-ball rules", () => {
  const shot = (firstContact: string | null, potted: string[] = [], cushionAfterContact = true) => ({ firstContact, potted, cushionAfterContact });

  it("racks nine balls and starts on the 1", () => {
    const table = nineball.createTable();
    expect(nineball.createInitialBodies(table)).toHaveLength(10);
    expect(nineRules.scoreboard(nineFrame()).on).toBe("1-ball");
  });

  it("is a foul to hit anything but the lowest ball first", () => {
    const o = judgeNine(nineFrame(), shot("ball2"));
    expect(o.foul).toBe(true);
    expect(o.state).toMatchObject({ current: 1, ballInHand: true });
  });

  it("lets any ball count once the lowest was hit first, and plays on", () => {
    const o = judgeNine(nineFrame(), shot("ball1", ["ball5"]));
    expect(o.foul).toBe(false);
    expect(o.state).toMatchObject({ current: 0, potted: [1, 0] });
  });

  it("wins the rack on a legal 9, even early by combination", () => {
    expect(judgeNine(nineFrame(), shot("ball1", ["ball9"])).state).toMatchObject({ over: true, winner: 0 });
  });

  it("spots the 9 again if it goes down on a foul", () => {
    const o = judgeNine(nineFrame(), shot("ball3", ["ball9"]));
    expect(o).toMatchObject({ foul: true, respotNine: true });
    expect(o.state.over).toBe(false);
  });

  it("passes the turn when nothing is potted", () => {
    expect(judgeNine(nineFrame(), shot("ball1")).state.current).toBe(1);
  });
});

describe("English billiards scoring", () => {
  const report = (hit: string[], potted: string[] = []) => ({ hit, potted, cannon: hit.length >= 2 });

  it("scores cannons, hazards and in-offs", () => {
    expect(scoreShot(report(["red", "yellow"])).points).toBe(2);
    expect(scoreShot(report(["red"], ["red"])).points).toBe(3);
    expect(scoreShot(report(["yellow"], ["yellow"])).points).toBe(2);
    expect(scoreShot(report(["red"], ["white"])).points).toBe(3);
    expect(scoreShot(report(["yellow"], ["white"])).points).toBe(2);
  });

  it("adds up several scores in one shot", () => {
    expect(scoreShot(report(["yellow", "red"], ["red"])).points).toBe(5);
  });

  it("gives the opponent points for hitting nothing", () => {
    const o = judgeBilliards(billiardsFrame(), report([]));
    expect(o).toMatchObject({ foul: true, turnPassed: true });
    expect(o.state.scores).toEqual([0, 2]);
  });

  it("keeps the player at the table after a score, and passes the turn after none", () => {
    expect(judgeBilliards(billiardsFrame(), report(["red"], ["red"])).state).toMatchObject({ current: 0, breakPoints: 3 });
    expect(judgeBilliards(billiardsFrame(), report(["red"])).state).toMatchObject({ current: 1, breakPoints: 0 });
  });

  it("ends the game at the target", () => {
    const near = { ...billiardsFrame(), scores: [48, 0] as [number, number] };
    expect(judgeBilliards(near, report(["red", "yellow"])).state).toMatchObject({ over: true, winner: 0 });
  });

  it("swaps the cue balls when the turn passes, and respots what was potted", () => {
    const table = billiards.createTable();
    const start = billiards.createInitialBodies(table);
    const final = start.map((b) => (b.id === "red" ? { ...b, state: "pocketed" as const } : b));
    const miss = { initial: start, final, keyframes: [], duration: 1, events: [{ type: "collision", t: 0.1, a: "white", b: "yellow" }] } as ShotResult;
    const j = billiardsRules.judge(billiardsFrame(), miss, { table });
    const at = (bodies: typeof start, id: string) => bodies.find((b) => b.id === id)!;
    expect(at(j.bodies, "white").position).toEqual(at(start, "yellow").position);
    expect(at(j.bodies, "red").state).toBe("stationary");
  });
});
