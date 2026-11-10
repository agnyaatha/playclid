import { describe, expect, it } from "vitest";
import { SKILLS, suggestShot, withParams } from "../ai/advisor";
import { findSolution } from "../lessons/solver";
import { snooker } from "@/games/snooker";
import { snookerLessons } from "@/games/snooker/lessons";
import { pool } from "@/games/pool";
import { carrom } from "@/games/carrom";
import type { DrillLesson } from "../lessons/schema";
import { stateAt } from "./playback";
import { scaleCloth } from "./params";

const table = snooker.createTable();
const rolled = (game: typeof snooker, k: number) => {
  const bodies = [game.createBody("white", 0.9, 0.5)];
  const res = game.simulate(table, bodies, game.input.buildShot({ aim: Math.PI / 2, power: 0.4, spinX: 0, spinY: 0 }), {
    params: scaleCloth(game.params, k),
  });
  return { y: res.final[0].position.y - 0.5, duration: res.duration };
};

describe("table speed calibration", () => {
  it("scales sliding and rolling friction and leaves everything else alone", () => {
    const s = scaleCloth(snooker.params, 1.5);
    expect(s.cloth.muRolling).toBeCloseTo(snooker.params.cloth.muRolling * 1.5, 12);
    expect(s.cloth.muSliding).toBeCloseTo(snooker.params.cloth.muSliding * 1.5, 12);
    expect(s.cloth.muSpinning).toBe(snooker.params.cloth.muSpinning);
    expect(s.ballBall).toEqual(snooker.params.ballBall);
    expect(snooker.params.cloth.muRolling).toBe(0.0128); // the original is not mutated
  });

  it("a faster cloth sends a ball further and a slower one stops it sooner", () => {
    const standard = rolled(snooker, 1).duration;
    expect(rolled(snooker, 0.7).duration).toBeGreaterThan(standard);
    expect(rolled(snooker, 1.4).duration).toBeLessThan(standard);
  });

  it("is honoured by every game, because it travels in the simulation options", () => {
    for (const game of [pool, carrom]) {
      const t = game.createTable();
      const run = (k: number) =>
        game.simulate(t, [game.createBody(game.input.strikerId, t.width / 2, 0.3)], game.input.buildShot({ aim: Math.PI / 2, power: 0.3, spinX: 0, spinY: 0 }), {
          params: scaleCloth(game.params, k),
        }).duration;
      // A faster cloth keeps the ball moving for longer (distance is not monotonic once it bounces off a cushion).
      expect(run(0.6)).toBeGreaterThan(run(1.6));
    }
  });

  it("replay uses the same parameters as the simulation, so the animation ends where the physics did", () => {
    const params = scaleCloth(snooker.params, 0.7);
    const res = snooker.simulate(table, [snooker.createBody("white", 0.9, 0.5)], snooker.input.buildShot({ aim: Math.PI / 2, power: 0.4, spinX: 0, spinY: 0 }), { params });
    expect(stateAt(res, res.duration, params.cloth)[0].position.y).toBeCloseTo(res.final[0].position.y, 9);
  });

  it("withParams makes the coach and solver search with the player's setting", () => {
    const fast = scaleCloth(snooker.params, 0.6);
    const g = withParams(snooker, fast);
    const a = g.simulate(table, [snooker.createBody("white", 0.9, 0.5)], snooker.input.buildShot({ aim: Math.PI / 2, power: 0.4, spinX: 0, spinY: 0 }));
    expect(a.final[0].position.y).toBeCloseTo(rolled(snooker, 0.6).y + 0.5, 9);
    expect(withParams(snooker, undefined)).toBe(snooker);

    const mid = table.length / 2;
    const bodies = [snooker.createBody("white", 0.85, mid), snooker.createBody("red1", 1.25, mid)];
    const s = suggestShot(snooker, table, { bodies, targets: [{ id: "red1", value: 1 }], skill: SKILLS.club, seed: 1, params: fast });
    expect(s?.kind).toBe("pot");
    const drill = snookerLessons.find((l): l is DrillLesson => l.id === "m3-straight-short")!;
    expect(findSolution(snooker, table, drill, fast)).not.toBeNull();
  });
});
