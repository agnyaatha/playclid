import { describe, expect, it } from "vitest";
import { startingBodies } from "./layout";
import { groupOf, judgeShot, newFrame, poolRules, remaining, type PoolState, type ShotReport } from "./rules";
import { createPoolTable } from "./table";

const table = createPoolTable();
const full = { solids: 7, stripes: 7 };
const shot = (firstContact: string | null, potted: string[] = [], cushionAfterContact = true): ShotReport => ({
  firstContact,
  potted,
  cushionAfterContact,
});
const state = (o: Partial<PoolState> = {}): PoolState => ({ ...newFrame(), ...o });

describe("open table", () => {
  it("assigns groups on the first legal pot, and the shooter continues", () => {
    const o = judgeShot(state(), shot("ball3", ["ball3"]), full);
    expect(o.state.groups).toEqual(["solids", "stripes"]);
    expect(o.state.current).toBe(0);
    expect(o.state.potted).toEqual([1, 0]);
    expect(o.foul).toBe(false);
  });

  it("gives stripes to the shooter who pots a stripe", () => {
    expect(judgeShot(state(), shot("ball10", ["ball10"]), full).state.groups).toEqual(["stripes", "solids"]);
  });

  it("passes the turn when nothing is potted", () => {
    const o = judgeShot(state(), shot("ball3"), full);
    expect(o.state.current).toBe(1);
    expect(o.foul).toBe(false);
    expect(o.state.groups).toEqual([null, null]);
  });

  it("fouls for hitting the 8-ball first", () => {
    const o = judgeShot(state(), shot("ball8"), full);
    expect(o.foul).toBe(true);
    expect(o.state).toMatchObject({ current: 1, ballInHand: true });
  });
});

describe("fouls", () => {
  const assigned = state({ groups: ["solids", "stripes"] });

  it("hitting no ball, hitting the wrong group, and scratching are fouls", () => {
    expect(judgeShot(assigned, shot(null), full).foul).toBe(true);
    expect(judgeShot(assigned, shot("ball10"), full).foul).toBe(true);
    expect(judgeShot(assigned, shot("ball2", ["white"]), full).foul).toBe(true);
  });

  it("a shot where nothing is potted and no ball reaches a cushion is a foul", () => {
    const o = judgeShot(assigned, shot("ball2", [], false), full);
    expect(o.foul).toBe(true);
    expect(o.message).toMatch(/cushion/);
  });

  it("a foul gives the opponent ball in hand and the pot does not count for the shooter", () => {
    const o = judgeShot(assigned, shot("ball2", ["ball2", "white"]), full);
    expect(o.state).toMatchObject({ current: 1, ballInHand: true });
    expect(o.whiteInHand).toBe(true);
    expect(o.made).toBe(0);
  });

  it("potting an opponent ball legally credits the opponent and passes the turn", () => {
    const o = judgeShot(assigned, shot("ball2", ["ball10"]), full);
    expect(o.state.potted).toEqual([0, 1]);
    expect(o.state.current).toBe(1);
  });
});

describe("the 8-ball", () => {
  const cleared = state({ groups: ["solids", "stripes"] });
  const solidsGone = { solids: 0, stripes: 4 };

  it("wins when potted after clearing the group", () => {
    const o = judgeShot(cleared, shot("ball8", ["ball8"]), solidsGone);
    expect(o.state).toMatchObject({ over: true, winner: 0 });
  });

  it("loses when potted early", () => {
    const o = judgeShot(cleared, shot("ball2", ["ball8"]), full);
    expect(o.state).toMatchObject({ over: true, winner: 1 });
  });

  it("loses when potted along with a scratch", () => {
    const o = judgeShot(cleared, shot("ball8", ["ball8", "white"]), solidsGone);
    expect(o.state).toMatchObject({ over: true, winner: 1 });
  });

  it("must be hit first once the group is cleared, and only then", () => {
    expect(judgeShot(cleared, shot("ball8"), solidsGone).foul).toBe(false);
    expect(judgeShot(cleared, shot("ball10"), solidsGone).foul).toBe(true);
  });
});

describe("helpers and the rules engine", () => {
  const bodies = startingBodies(table);

  it("classifies balls and counts what is on the table", () => {
    expect(["ball1", "ball8", "ball9", "white"].map(groupOf)).toEqual(["solids", null, "stripes", null]);
    expect(remaining(bodies)).toEqual(full);
  });

  it("racks fifteen balls with no overlaps and the 8 behind the apex", () => {
    expect(bodies).toHaveLength(16);
    const racked = bodies.filter((b) => b.id !== "white");
    const apexY = Math.min(...racked.map((b) => b.position.y));
    expect(bodies.find((b) => b.id === "ball8")!.position.y).toBeGreaterThan(apexY);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const d = Math.hypot(bodies[i].position.x - bodies[j].position.x, bodies[i].position.y - bodies[j].position.y);
        expect(d).toBeGreaterThan(2 * bodies[i].radius);
      }
    }
  });

  it("offers the right targets: any non-8 on an open table, own group, then the 8", () => {
    const open = poolRules.targets!(newFrame(), bodies);
    expect(open).toHaveLength(14);
    expect(open.some((t) => t.id === "ball8")).toBe(false);
    expect(poolRules.targets!(state({ groups: ["stripes", "solids"] }), bodies)).toHaveLength(7);
    const noSolids = bodies.map((b) => (groupOf(b.id) === "solids" ? { ...b, state: "pocketed" as const } : b));
    expect(poolRules.targets!(state({ groups: ["solids", "stripes"] }), noSolids)).toEqual([{ id: "ball8", value: 1 }]);
  });

  it("describes what is on in the scoreboard", () => {
    expect(poolRules.scoreboard(newFrame()).on).toBe("Open table");
    expect(poolRules.scoreboard(state({ groups: ["stripes", "solids"] })).on).toBe("Stripes");
  });
});

import { pool } from "./index";

describe("ball in hand", () => {
  it("is flagged after a foul and cleared after a clean shot", () => {
    const fouled = judgeShot(state(), shot(null), full).state;
    expect(poolRules.ballInHand!(fouled)).toBe(true);
    const clean = judgeShot(fouled, shot("ball3", ["ball3"]), full).state;
    expect(poolRules.ballInHand!(clean)).toBe(false);
  });

  it("lets the cue ball go anywhere clear on the cloth, and refuses a spot on a ball or off the table", () => {
    const bodies = startingBodies(table);
    const moved = pool.placeStriker!(table, bodies, { x: 0.3, y: 1.0 });
    expect(moved?.find((b) => b.id === "white")?.position).toMatchObject({ x: 0.3, y: 1.0 });
    const racked = bodies.find((b) => b.id === "ball8")!.position;
    expect(pool.placeStriker!(table, bodies, { x: racked.x, y: racked.y })).toBeNull();
    expect(pool.placeStriker!(table, bodies, { x: -1, y: 0.5 })).toBeNull();
  });
});
