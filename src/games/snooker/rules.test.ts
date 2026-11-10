import { describe, expect, it } from "vitest";
import type { Body } from "@/core/types";
import { snooker } from "./index";
import { colourSpots, startingBodies } from "./layout";
import { applyOutcome, ballValue, judgeShot, newFrame, reportShot, respotPosition, snookerRules, type FrameState, type ShotReport } from "./rules";
import { SNOOKER } from "./table";

const table = snooker.createTable();
const R = SNOOKER.ballRadius;
const shot = (firstContact: string | null, ...potted: string[]): ShotReport => ({ firstContact, potted });
const state = (o: Partial<FrameState> = {}): FrameState => ({ ...newFrame(), ...o });

describe("ball values", () => {
  it("scores reds 1 and the colours 2 to 7", () => {
    expect(["red3", "yellow", "green", "brown", "blue", "pink", "black"].map(ballValue)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("the red phase", () => {
  it("pots a red: 1 point, the same player continues, a colour is on", () => {
    const o = judgeShot(state(), shot("red1", "red1"));
    expect(o.foul).toBe(false);
    expect(o.state).toMatchObject({ scores: [1, 0], current: 0, breakPoints: 1, redsLeft: 14, phase: "colour" });
  });

  it("scores every red potted in one shot", () => {
    const o = judgeShot(state(), shot("red1", "red1", "red2"));
    expect(o.state.scores[0]).toBe(2);
    expect(o.state.redsLeft).toBe(13);
  });

  it("passes the turn, without a foul, when a red is hit but nothing is potted", () => {
    const o = judgeShot(state({ breakPoints: 0 }), shot("red4"));
    expect(o.foul).toBe(false);
    expect(o.state).toMatchObject({ current: 1, phase: "red", scores: [0, 0] });
  });

  it("fouls for hitting no ball: 4 to the opponent", () => {
    const o = judgeShot(state(), shot(null));
    expect(o.foul).toBe(true);
    expect(o.state.scores).toEqual([0, 4]);
    expect(o.state.current).toBe(1);
  });

  it("fouls for hitting a colour first, worth the colour's value above 4", () => {
    expect(judgeShot(state(), shot("yellow")).state.scores).toEqual([0, 4]);
    expect(judgeShot(state(), shot("blue")).state.scores).toEqual([0, 5]);
    expect(judgeShot(state(), shot("black")).state.scores).toEqual([0, 7]);
  });

  it("fouls for potting a colour instead of a red, and respots that colour", () => {
    const o = judgeShot(state(), shot("red1", "red1", "green"));
    expect(o.foul).toBe(true);
    expect(o.state.scores).toEqual([0, 4]);
    expect(o.respot).toEqual(["green"]);
    // The red potted in the same shot stays off the table but scores nothing.
    expect(o.state.redsLeft).toBe(14);
  });

  it("fouls when the white is potted, and puts it in hand", () => {
    const o = judgeShot(state(), shot("red1", "white"));
    expect(o.foul).toBe(true);
    expect(o.whiteInHand).toBe(true);
    expect(o.state.scores).toEqual([0, 4]);
  });

  it("takes the biggest value involved: white off the black is 7", () => {
    expect(judgeShot(state(), shot("black", "white")).state.scores).toEqual([0, 7]);
  });

  it("never fines more than 7", () => {
    const o = judgeShot(state(), shot("black", "pink", "white"));
    expect(o.state.scores[1]).toBe(7);
  });

  it("ends the opponent's break and resets the break counter", () => {
    const o = judgeShot(state({ breakPoints: 12, scores: [12, 0] }), shot(null));
    expect(o.state.breakPoints).toBe(0);
    expect(o.state.scores).toEqual([12, 4]);
  });
});

describe("the colour after a red", () => {
  const colour = (o: Partial<FrameState> = {}) => state({ phase: "colour", redsLeft: 14, scores: [1, 0], breakPoints: 1, ...o });

  it("scores the colour, respots it and puts a red on again", () => {
    const o = judgeShot(colour(), shot("blue", "blue"));
    expect(o.foul).toBe(false);
    expect(o.state).toMatchObject({ scores: [6, 0], phase: "red", breakPoints: 6, current: 0 });
    expect(o.respot).toEqual(["blue"]);
  });

  it("treats the first colour hit as nominated when none was nominated", () => {
    expect(judgeShot(colour(), shot("pink", "pink")).foul).toBe(false);
    expect(judgeShot(colour(), shot("pink", "black")).foul).toBe(true);
  });

  it("honours an explicit nomination", () => {
    expect(judgeShot(colour(), shot("blue", "blue"), "blue").foul).toBe(false);
    const wrong = judgeShot(colour(), shot("green", "green"), "blue");
    expect(wrong.foul).toBe(true);
    expect(wrong.state.scores[1]).toBe(5);
  });

  it("fouls for hitting a red, 7 to the opponent because no colour was nominated", () => {
    const o = judgeShot(colour(), shot("red2"));
    expect(o.foul).toBe(true);
    expect(o.state.scores).toEqual([1, 7]);
    expect(o.state.phase).toBe("red");
    expect(o.state.current).toBe(1);
  });

  it("fouls for potting two colours", () => {
    expect(judgeShot(colour(), shot("blue", "blue", "pink")).foul).toBe(true);
  });

  it("passes the turn when the colour is missed, back to red", () => {
    const o = judgeShot(colour(), shot("blue"));
    expect(o.foul).toBe(false);
    expect(o.state).toMatchObject({ current: 1, phase: "red", breakPoints: 0 });
  });

  it("starts the colour clearance when the colour after the last red is taken", () => {
    const o = judgeShot(colour({ redsLeft: 0 }), shot("black", "black"));
    expect(o.state).toMatchObject({ phase: "clearance", nextColour: 0, current: 0 });
    expect(o.respot).toEqual(["black"]);
  });
});

describe("the colour clearance", () => {
  const clear = (nextColour: number, o: Partial<FrameState> = {}) => state({ phase: "clearance", redsLeft: 0, nextColour, ...o });

  it("pots the colours in order and does not respot them", () => {
    const o = judgeShot(clear(0), shot("yellow", "yellow"));
    expect(o.state).toMatchObject({ nextColour: 1, scores: [2, 0] });
    expect(o.respot).toEqual([]);
  });

  it("fouls for hitting the wrong colour and for potting out of order, respotting the ball", () => {
    expect(judgeShot(clear(1), shot("brown")).foul).toBe(true);
    const o = judgeShot(clear(1), shot("green", "brown"));
    expect(o.foul).toBe(true);
    expect(o.respot).toEqual(["brown"]);
    expect(o.state.nextColour).toBe(1);
  });

  it("passes the turn on a miss without moving the colour on", () => {
    const o = judgeShot(clear(2), shot("brown"));
    expect(o.state).toMatchObject({ current: 1, nextColour: 2 });
  });

  it("ends the frame when the black is potted, and the higher score wins", () => {
    const o = judgeShot(clear(5, { scores: [60, 50] }), shot("black", "black"));
    expect(o.state).toMatchObject({ frameOver: true, winner: 0, scores: [67, 50] });
  });

  it("ends the frame on a foul on the black, giving the opponent the points", () => {
    const o = judgeShot(clear(5, { scores: [40, 50] }), shot("black", "white"));
    expect(o.state).toMatchObject({ frameOver: true, winner: 1 });
    expect(o.state.scores).toEqual([40, 57]);
  });
});

describe("level scores on the black", () => {
  it("respots the black for a decider when the scores are level", () => {
    const o = judgeShot(state({ phase: "clearance", redsLeft: 0, nextColour: 5, scores: [20, 27] }), shot("black", "black"));
    expect(o.state.frameOver).toBe(false);
    expect(o.state.blackDecider).toBe(true);
    expect(o.state.scores).toEqual([27, 27]);
    expect(o.state.current).toBe(1);
  });

  it("is won by the next player to pot the black", () => {
    const decider = state({ phase: "clearance", redsLeft: 0, nextColour: 5, scores: [27, 27], blackDecider: true, current: 1 });
    const o = judgeShot(decider, shot("black", "black"));
    expect(o.state).toMatchObject({ frameOver: true, winner: 1 });
  });

  it("is won by the opponent after a foul in the decider", () => {
    const decider = state({ phase: "clearance", redsLeft: 0, nextColour: 5, scores: [27, 27], blackDecider: true, current: 1 });
    expect(judgeShot(decider, shot("yellow")).state).toMatchObject({ frameOver: true, winner: 0 });
  });

  it("keeps the decider going when the black is hit but missed", () => {
    const decider = state({ phase: "clearance", redsLeft: 0, nextColour: 5, scores: [27, 27], blackDecider: true, current: 1 });
    const o = judgeShot(decider, shot("black"));
    expect(o.state).toMatchObject({ frameOver: false, current: 0 });
  });
});

describe("foul side effects on the phase", () => {
  it("a foul after a red (colour on) with reds left goes back to red for the opponent", () => {
    const o = judgeShot(state({ phase: "colour", redsLeft: 3 }), shot(null));
    expect(o.state.phase).toBe("red");
  });

  it("a foul on the colour after the last red starts the clearance", () => {
    const o = judgeShot(state({ phase: "colour", redsLeft: 0 }), shot(null));
    expect(o.state).toMatchObject({ phase: "clearance", nextColour: 0 });
  });

  it("potting the last red in a foul gives the opponent a colour", () => {
    const o = judgeShot(state({ redsLeft: 1 }), shot("blue", "red1"));
    expect(o.state).toMatchObject({ redsLeft: 0, phase: "colour" });
  });
});

describe("reading a shot from the physics", () => {
  it("reports the first ball the white hits and the balls potted in order", () => {
    const res = snooker.simulate(
      table,
      [
        snooker.createBody("white", 0.8, 1.2),
        snooker.createBody("red1", 0.8, 1.2 + 2 * R + 0.1),
      ],
      snooker.input.buildShot({ aim: Math.PI / 2, power: 0.3, spinX: 0, spinY: 0 }),
    );
    const r = reportShot(res);
    expect(r.firstContact).toBe("red1");
    expect(r.potted).toEqual([]);
  });

  it("sees a ball potted: white takes a red into the middle pocket", () => {
    const mid = table.length / 2;
    const res = snooker.simulate(
      table,
      [snooker.createBody("white", 0.85, mid), snooker.createBody("red1", 1.25, mid)],
      snooker.input.buildShot({ aim: 0, power: 0.35, spinX: 0, spinY: 0 }),
    );
    const r = reportShot(res);
    expect(r).toMatchObject({ firstContact: "red1", potted: ["red1"] });
    expect(judgeShot(state(), r).state.scores).toEqual([1, 0]);
  });
});

describe("respotting", () => {
  const bodies = (): Body[] => startingBodies(table).map((b) => ({ ...b }));
  const spots = colourSpots(table);

  it("returns a colour to its own spot when free", () => {
    const p = respotPosition(table, bodies().filter((b) => b.id !== "blue"), "blue", new Set(["blue"]));
    expect(p).toEqual({ x: spots.blue.x, y: spots.blue.y });
  });

  it("uses the highest free spot when its own is taken", () => {
    const b = bodies().map((x) => (x.id === "red1" ? { ...x, position: { x: spots.pink.x, y: spots.pink.y, z: 0 } } : x));
    // Pink's spot holds a red; the black sits on its spot too; blue (the next highest) is free once blue itself is lifted.
    const taken = b.filter((x) => x.id !== "blue");
    const p = respotPosition(table, taken, "pink", new Set(["pink"]));
    expect(p).toEqual({ x: spots.blue.x, y: spots.blue.y });
  });

  it("puts the colour as near as possible up the table when every spot is taken", () => {
    const blockers: Body[] = Object.values(spots).map((s, i) => snooker.createBody(`red${i + 1}`, s.x, s.y));
    const p = respotPosition(table, blockers, "yellow", new Set());
    expect(p.x).toBeCloseTo(spots.yellow.x, 9);
    expect(p.y).toBeGreaterThan(spots.yellow.y);
  });

  it("applies an outcome: respots a potted colour and replaces a potted white", () => {
    const final = bodies().map((b) =>
      b.id === "green" || b.id === "white" ? { ...b, state: "pocketed" as const, position: { x: 0, y: 0, z: 0 } } : b,
    );
    const out = applyOutcome(table, final, { state: newFrame(), foul: true, points: 4, respot: ["green"], whiteInHand: true, message: "" });
    const g = out.find((b) => b.id === "green")!;
    const w = out.find((b) => b.id === "white")!;
    expect(g.state).toBe("stationary");
    expect(g.position).toMatchObject({ x: spots.green.x, y: spots.green.y });
    expect(w.state).toBe("stationary");
    expect(w.position.y).toBeLessThan(SNOOKER.baulkLine);
  });
});

describe("the rules engine interface", () => {
  it("runs a shot through judge and reports the scoreboard", () => {
    const mid = table.length / 2;
    const res = snooker.simulate(
      table,
      [snooker.createBody("white", 0.85, mid), snooker.createBody("red1", 1.25, mid)],
      snooker.input.buildShot({ aim: 0, power: 0.35, spinX: 0, spinY: 0 }),
    );
    const frame = snookerRules.newFrame();
    const j = snookerRules.judge(frame, res, { table });
    expect(j).toMatchObject({ foul: false, points: 1 });
    const sb = snookerRules.scoreboard(j.state);
    expect(sb).toMatchObject({ current: 0, breakPoints: 1, on: "Any colour", over: false });
    expect(sb.players.map((p) => p.score)).toEqual([1, 0]);
  });

  it("offers nominations only when a colour is on", () => {
    const frame = snookerRules.newFrame();
    const bodies = startingBodies(table);
    expect(snookerRules.nominations!(frame, bodies)).toBeNull();
    const colourOn = { ...(frame as FrameState), phase: "colour" as const };
    expect(snookerRules.nominations!(colourOn, bodies)).toEqual(["yellow", "green", "brown", "blue", "pink", "black"]);
  });
});

describe("white in hand", () => {
  it("is flagged only when the white was potted, and cleared on the next shot", () => {
    const potted = judgeShot(state(), shot("red1", "white"));
    expect(potted.state.whiteInHand).toBe(true);
    expect(snookerRules.ballInHand!(potted.state)).toBe(true);
    const next = judgeShot(potted.state, shot("red1", "red1"));
    expect(next.state.whiteInHand).toBe(false);
    expect(judgeShot(state(), shot(null)).state.whiteInHand).toBe(false);
  });

  it("lets the white be placed inside the D, and refuses outside it or on a ball", () => {
    const bodies = startingBodies(table);
    const inD = snooker.placeStriker!(table, bodies, { x: table.width / 2 + 0.1, y: SNOOKER.baulkLine - 0.1 });
    expect(inD?.find((b) => b.id === "white")?.position.x).toBeCloseTo(table.width / 2 + 0.1, 9);
    expect(snooker.placeStriker!(table, bodies, { x: table.width / 2, y: SNOOKER.baulkLine + 0.2 })).toBeNull();
    expect(snooker.placeStriker!(table, bodies, { x: table.width / 2 + 0.6, y: SNOOKER.baulkLine - 0.1 })).toBeNull();
    const brown = colourSpots(table).brown;
    expect(snooker.placeStriker!(table, bodies, { x: brown.x, y: brown.y })).toBeNull();
  });
});
