import { describe, expect, it } from "vitest";
import type { Body, ShotResult } from "@/core/types";
import { snooker } from "./index";
import { isSnookered } from "./snookered";
import { judgeShot, newFrame, snookerRules, type FrameState, type ShotReport } from "./rules";

const table = snooker.createTable();
const ball = (id: string, x: number, y: number): Body => snooker.createBody(id, x, y);
const shot = (firstContact: string | null, ...potted: string[]): ShotReport => ({ firstContact, potted });
const state = (o: Partial<FrameState> = {}): FrameState => ({ ...newFrame(), ...o });

describe("snookered", () => {
  const white = ball("white", 0.9, 0.5);
  const target = ball("red1", 0.9, 3.0);

  it("is true when a ball sits squarely between the cue ball and the only ball on", () => {
    expect(isSnookered([white, target, ball("blue", 0.9, 1.5)], ["red1"])).toBe(true);
  });

  it("is false with a clear view", () => {
    expect(isSnookered([white, target], ["red1"])).toBe(false);
  });

  it("is true when one edge of the ball is hidden: the full ball cannot be hit", () => {
    // A blocker offset to one side hides one extreme edge of the target.
    expect(isSnookered([white, target, ball("blue", 0.935, 1.5)], ["red1"])).toBe(true);
  });

  it("is false when the blocker is well clear of the line", () => {
    expect(isSnookered([white, target, ball("blue", 1.4, 1.5)], ["red1"])).toBe(false);
  });

  it("is false when any ball on is visible, even if another is hidden", () => {
    const visible = ball("red2", 0.3, 2.5);
    expect(isSnookered([white, target, visible, ball("blue", 0.9, 1.5)], ["red1", "red2"])).toBe(false);
  });

  it("is false when nothing is on or the white is off the table", () => {
    expect(isSnookered([white, target], [])).toBe(false);
    expect(isSnookered([{ ...white, state: "pocketed" }, target], ["red1"])).toBe(false);
  });
});

describe("free ball", () => {
  const freeState = state({ freeBall: true });

  it("scores the value of the ball on when a free ball is potted as a red, and puts the red back", () => {
    const o = judgeShot(freeState, shot("red2", "red2"), "red2");
    expect(o.foul).toBe(false);
    expect(o.points).toBe(1);
    expect(o.state).toMatchObject({ scores: [1, 0], phase: "colour", redsLeft: 15 });
    expect(o.restore).toEqual(["red2"]);
  });

  it("respots a colour potted as the free ball and scores one point in the red phase", () => {
    const o = judgeShot(freeState, shot("blue", "blue"), "blue");
    expect(o.state.scores[0]).toBe(1);
    expect(o.respot).toEqual(["blue"]);
  });

  it("allows hitting the free ball first without a foul, but not an unrelated ball", () => {
    expect(judgeShot(freeState, shot("blue"), "blue").foul).toBe(false);
    expect(judgeShot(freeState, shot("black"), "blue").foul).toBe(true);
  });

  it("still allows hitting the real ball on", () => {
    expect(judgeShot(freeState, shot("red1"), "blue").foul).toBe(false);
  });

  it("is used up after the shot", () => {
    expect(judgeShot(freeState, shot("blue"), "blue").state.freeBall).toBe(false);
  });
});

describe("the engine awards a free ball after a foul when snookered", () => {
  const result = (bodies: Body[], events: ShotResult["events"]): ShotResult => ({
    initial: bodies,
    events,
    keyframes: [],
    duration: 1,
    final: bodies,
  });
  const bodies = [ball("white", 0.9, 0.5), ball("red1", 0.9, 3.0), ball("blue", 0.9, 1.5)];

  it("gives the incoming player a free ball", () => {
    // The white hits the blue first (a foul with a red on) and the red is hidden behind it.
    const j = snookerRules.judge(snookerRules.newFrame(), result(bodies, [{ type: "collision", t: 0.5, a: "white", b: "blue" }]), { table });
    expect(j.foul).toBe(true);
    expect((j.state as FrameState).freeBall).toBe(true);
    expect(j.message).toMatch(/free ball/i);
    expect(snookerRules.scoreboard(j.state).on).toMatch(/Free ball/);
    expect(snookerRules.nominations!(j.state, j.bodies)).toContain("blue");
  });

  it("does not, when the incoming player has a clear view of a ball on", () => {
    const clear = [ball("white", 0.9, 0.5), ball("red1", 0.5, 3.0), ball("blue", 1.5, 1.5)];
    const j = snookerRules.judge(snookerRules.newFrame(), result(clear, [{ type: "collision", t: 0.5, a: "white", b: "blue" }]), { table });
    expect((j.state as FrameState).freeBall).toBe(false);
  });
});

describe("starting a frame part-way", () => {
  it("starts the colour clearance when there are no reds left", () => {
    expect(snookerRules.newFrame({ redsLeft: 0 })).toMatchObject({ phase: "clearance", redsLeft: 0 });
    expect(snookerRules.newFrame({ redsLeft: 3 })).toMatchObject({ phase: "red", redsLeft: 3 });
  });
});

describe("foul and a miss", () => {
  it("is offered when no ball on was hit, and not for other fouls", () => {
    expect(judgeShot(state(), shot(null)).state.missOffered).toBe(true);
    expect(judgeShot(state(), shot("blue")).state.missOffered).toBe(true);
    // Hit a red (on) but potted the white: a foul, but not a miss.
    expect(judgeShot(state(), shot("red1", "white")).state.missOffered).toBe(false);
    // Legal shots never offer it.
    expect(judgeShot(state(), shot("red1", "red1")).state.missOffered).toBe(false);
  });

  it("is cleared by the next shot", () => {
    const missed = judgeShot(state(), shot(null)).state;
    expect(judgeShot(missed, shot("red1", "red1")).state.missOffered).toBe(false);
  });

  it("replaying keeps the penalty but gives the offender the shot again with a fresh visit", () => {
    const before = state({ scores: [10, 3], breakPoints: 7, current: 0 });
    const after = judgeShot(before, shot("blue")).state; // player 1 misses: 5 to player 2
    expect(after).toMatchObject({ current: 1, scores: [10, 8], missOffered: true });
    const replay = snookerRules.replayAfterMiss!(before, after) as FrameState;
    expect(replay).toMatchObject({ current: 0, scores: [10, 8], breakPoints: 0, missOffered: false, freeBall: false });
    expect(replay.phase).toBe(before.phase);
    expect(replay.redsLeft).toBe(before.redsLeft);
  });
});
