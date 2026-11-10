import { describe, expect, it } from "vitest";
import { carrom } from "./index";
import { startingBodies } from "./layout";
import { carromRules, judgeShot, newFrame, type CarromState } from "./rules";

const state = (o: Partial<CarromState> = {}): CarromState => ({ ...newFrame(), ...o });
const table = carrom.createTable();

describe("carrom rules", () => {
  it("an own coin scores 1 and the player shoots again", () => {
    const o = judgeShot(state(), ["w1"]);
    expect(o.state).toMatchObject({ current: 0, scores: [1, 0], coins: [1, 0] });
    expect(o.foul).toBe(false);
  });

  it("pocketing nothing passes the turn", () => {
    expect(judgeShot(state(), []).state.current).toBe(1);
  });

  it("an opponent coin scores for the opponent and ends the turn", () => {
    const o = judgeShot(state(), ["b1"]);
    expect(o.state).toMatchObject({ current: 1, scores: [0, 1] });
  });

  it("potting the striker is a foul: coins from that shot return and the turn passes", () => {
    const o = judgeShot(state(), ["w1", "striker"]);
    expect(o.foul).toBe(true);
    expect(o.respot).toContain("w1");
    expect(o.state).toMatchObject({ current: 1, scores: [0, 0] });
  });

  it("a striker foul also costs an earlier coin when none was pocketed this shot", () => {
    const o = judgeShot(state({ coins: [2, 0], scores: [2, 0] }), ["striker"]);
    expect(o.state.coins[0]).toBe(1);
    expect(o.state.scores[0]).toBe(1);
  });

  it("the queen counts 3 only when covered by an own coin in the same shot", () => {
    const o = judgeShot(state(), ["queen", "w1"]);
    expect(o.state.scores[0]).toBe(1 + 3);
    expect(o.state.queenPending).toBeNull();
  });

  it("an uncovered queen keeps the turn, then is covered on the next shot", () => {
    const first = judgeShot(state(), ["queen"]);
    expect(first.state).toMatchObject({ queenPending: 0, current: 0 });
    const second = judgeShot(first.state, ["w2"]);
    expect(second.state.scores[0]).toBe(1 + 3);
  });

  it("an uncovered queen goes back on the board if the cover is missed", () => {
    const first = judgeShot(state(), ["queen"]);
    const missed = judgeShot(first.state, []);
    expect(missed.respot).toContain("queen");
    expect(missed.state).toMatchObject({ current: 1, queenPending: null });
  });

  it("clearing all nine of your coins wins the frame", () => {
    const o = judgeShot(state({ coins: [8, 0], scores: [8, 0] }), ["w9"]);
    expect(o.state).toMatchObject({ over: true, winner: 0 });
  });
});

describe("carrom rules engine", () => {
  const bodies = startingBodies(table);

  it("offers the shooter's own coins and the queen as targets", () => {
    const t = carromRules.targets!(newFrame(), bodies);
    expect(t.filter((x) => x.id.startsWith("w"))).toHaveLength(9);
    expect(t.find((x) => x.id === "queen")?.value).toBe(3);
    expect(t.some((x) => x.id.startsWith("b"))).toBe(false);
  });

  it("is wired into the game and judges a simulated flick", () => {
    expect(carrom.rules).toBe(carromRules);
    const res = carrom.simulate(table, bodies, carrom.input.buildShot({ aim: Math.PI / 2, power: 0.7, spinX: 0, spinY: 0 }));
    const j = carromRules.judge(newFrame(), res, { table });
    expect(j.bodies.find((b) => b.id === "striker")!.state).toBe("stationary");
    expect(carromRules.scoreboard(j.state).players).toHaveLength(2);
  });
});
