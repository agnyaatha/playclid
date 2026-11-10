import { describe, expect, it } from "vitest";
import type { Game } from "@/core/game";
import { scanCannon } from "@/core/lessons/cannon";
import { validateLesson } from "@/core/lessons/logic";
import type { DrillLesson, Lesson } from "@/core/lessons/schema";
import { findSolution } from "@/core/lessons/solver";
import type { Body, ShotResult } from "@/core/types";
import { crokinole, crokinoleLessons, DISCS, judgeShot as judgeCrok, newFrame as crokFrame, ringValue, STRIKER as CROK_STRIKER } from "./crokinole";
import { judgeBodies, newFrame as shuffleFrame, PUCKS, roundPoints, shuffleboard, shuffleLessons, SHUFFLE, STRIKER as SHUFFLE_STRIKER, zoneValue } from "./shuffleboard";
import { judgeScan, newFrame as threeFrame, threecushion, threeCushionLessons } from "./threecushion";

const lessonsOf: Array<[string, Game, Lesson[]]> = [
  ["three-cushion", threecushion, threeCushionLessons],
  ["shuffleboard", shuffleboard, shuffleLessons],
  ["crokinole", crokinole, crokinoleLessons],
];

describe.each(lessonsOf)("%s exercises", (_n, game, lessons) => {
  const table = game.createTable();
  it.each(lessons.map((l) => [l.id, l] as const))("%s is valid and can be made", (_id, lesson) => {
    expect(validateLesson(game, table, lesson)).toEqual([]);
    expect(findSolution(game, table, lesson as DrillLesson), "no passing shot").not.toBeNull();
  }, 120_000);
});

describe("three-cushion", () => {
  it("scores only with both balls hit and three cushions before the second", () => {
    expect(judgeScan(threeFrame(), { made: true, cushions: 3 }).state).toMatchObject({ scores: [1, 0], current: 0, run: 1 });
    expect(judgeScan(threeFrame(), { made: true, cushions: 2 }).state).toMatchObject({ scores: [0, 0], current: 1 });
    expect(judgeScan(threeFrame(), { made: false, cushions: 5 }).state.current).toBe(1);
  });

  it("wins at the target", () => {
    expect(judgeScan({ ...threeFrame(), scores: [14, 3] }, { made: true, cushions: 4 }).state).toMatchObject({ over: true, winner: 0 });
  });

  it("counts cushions only up to the second ball", () => {
    const result = {
      events: [
        { type: "cushion", t: 1, body: "white", cushion: "top" },
        { type: "collision", t: 2, a: "white", b: "red" },
        { type: "cushion", t: 3, body: "white", cushion: "left" },
        { type: "collision", t: 4, a: "yellow", b: "white" },
        { type: "cushion", t: 5, body: "white", cushion: "right" },
      ],
    } as ShotResult;
    expect(scanCannon(result, "white")).toEqual({ hit: ["red", "yellow"], cushions: 2, made: true });
  });

  it("is a table with no pockets", () => {
    expect(threecushion.createTable().pockets).toEqual([]);
  });
});

describe("shuffleboard", () => {
  const table = shuffleboard.createTable();
  const puck = (id: string, y: number): Body => shuffleboard.createBody(id, 0.25, y);
  const P = SHUFFLE.play;

  it("values the zones", () => {
    expect([P + 0.01, P - 0.1, P - 0.4, P - 1, P - 2].map(zoneValue)).toEqual([0, 3, 2, 1, 0]);
  });

  it("scores only the leader's pucks beyond the opponent's best", () => {
    expect(roundPoints([puck("a1", P - 0.1), puck("a2", P - 1), puck("b1", P - 0.4)])).toEqual([3, 0]);
    expect(roundPoints([puck("a1", P - 0.5), puck("b1", P - 0.1), puck("b2", P - 0.4)])).toEqual([0, 5]);
  });

  it("ignores pucks that went over the end", () => {
    expect(roundPoints([puck("a1", P + 0.05), puck("b1", P - 0.4)])).toEqual([0, 2]);
  });

  it("retires each shot to its player and hands over, then scores at the end of the round", () => {
    let s = shuffleFrame();
    let bodies: Body[] = [puck(SHUFFLE_STRIKER, P - 0.1)];
    const first = judgeBodies(s, bodies, table);
    expect(first.bodies.map((b) => b.id).sort()).toEqual(["a1", SHUFFLE_STRIKER]);
    expect(first.state.current).toBe(1);

    s = { ...shuffleFrame(), shot: PUCKS * 2 - 1, current: 1 };
    bodies = [puck("a1", P - 0.4), puck(SHUFFLE_STRIKER, P - 0.1)];
    const end = judgeBodies(s, bodies, table);
    expect(end.state).toMatchObject({ shot: 0, round: 2, scores: [0, 3] });
    expect(end.bodies.map((b) => b.id)).toEqual([SHUFFLE_STRIKER]);
  });
});

describe("crokinole", () => {
  const table = crokinole.createTable();
  const c = table.width / 2;
  const disc = (id: string, x: number, y: number): Body => crokinole.createBody(id, x, y);
  const shot = (initial: Body[], final: Body[], events: ShotResult["events"] = []) => ({ initial, final, events, keyframes: [], duration: 1 }) as ShotResult;

  it("values the rings", () => {
    expect([0.05, 0.15, 0.25, 0.32].map(ringValue)).toEqual([15, 10, 5, 0]);
  });

  it("scores a disc where it lands, and hands over", () => {
    const final = [disc(CROK_STRIKER, c, c - 0.05)];
    const o = judgeCrok(crokFrame(), shot(final, final));
    expect(o.state).toMatchObject({ scores: [15, 0], current: 1, played: [1, 0] });
    expect(o.bodies.map((b) => b.id).sort()).toEqual(["a1", CROK_STRIKER]);
  });

  it("banks 20 for the hole", () => {
    const final = [{ ...disc(CROK_STRIKER, c, c), state: "pocketed" as const }];
    const o = judgeCrok(crokFrame(), shot(final, final, [{ type: "pocket", t: 1, body: CROK_STRIKER, pocket: "hole" }]));
    expect(o.state.scores).toEqual([20, 0]);
  });

  it("takes your disc off if you miss the opponent's", () => {
    const initial = [disc("b1", c + 0.05, c), disc(CROK_STRIKER, c, c - 0.28)];
    const final = [initial[0], disc(CROK_STRIKER, c - 0.05, c)];
    const o = judgeCrok(crokFrame(), shot(initial, final));
    expect(o.bodies.find((b) => b.id === "a1")!.state).toBe("pocketed");
    expect(o.state.scores).toEqual([0, 15]);
  });

  it("removes a disc that drops in the ditch", () => {
    const final = [disc(CROK_STRIKER, c + 0.32, c)];
    const o = judgeCrok(crokFrame(), shot(final, final));
    expect(o.bodies.find((b) => b.id === "a1")!.state).toBe("pocketed");
  });

  it("ends after every disc is played, with the higher score winning", () => {
    const final = [disc(CROK_STRIKER, c, c - 0.05)];
    const last = { ...crokFrame(), played: [DISCS - 1, DISCS] as [number, number] };
    expect(judgeCrok(last, shot(final, final)).state).toMatchObject({ over: true, winner: 0 });
  });

  it("drops a slow disc in the hole, but a fast one skims over it", () => {
    const start = crokinole.createInitialBodies(table);
    const potted = (power: number) => crokinole.simulate(table, start, crokinole.input.buildShot({ aim: Math.PI / 2, power, spinX: 0, spinY: 0 })).events.some((e) => e.type === "pocket");
    expect(potted(0.35)).toBe(true);
    expect(potted(0.9)).toBe(false);
  });

  it("keeps a disc on the board when it strikes the round wall", () => {
    const start = crokinole.createInitialBodies(table);
    for (let i = 0; i < 24; i++) {
      const r = crokinole.simulate(table, start, crokinole.input.buildShot({ aim: (i * Math.PI) / 12, power: 1, spinX: 0, spinY: 0 }));
      const s = r.final.find((b) => b.id === CROK_STRIKER)!;
      if (s.state !== "pocketed") expect(Math.hypot(s.position.x - c, s.position.y - c)).toBeLessThanOrEqual(0.335);
    }
  });
});
