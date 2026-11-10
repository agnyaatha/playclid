import { describe, expect, it } from "vitest";
import { snooker } from "@/games/snooker";
import { startingBodies } from "@/games/snooker/layout";
import { newFrame, snookerRules, type FrameState } from "@/games/snooker/rules";
import type { Body } from "../types";
import { perturb, SKILLS, suggestShot } from "./advisor";
import { gaussian, makeRng } from "./rng";

const table = snooker.createTable();
const MID = table.length / 2;
const ball = (id: string, x: number, y: number) => snooker.createBody(id, x, y);
const reds = (...ids: string[]) => ids.map((id) => ({ id, value: 1 }));

describe("rng", () => {
  it("is deterministic for a seed and varies between seeds", () => {
    const a = makeRng(7);
    const b = makeRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(makeRng(8)()).not.toBe(makeRng(7)());
  });

  it("produces roughly standard normal samples", () => {
    const r = makeRng(3);
    const xs = Array.from({ length: 4000 }, () => gaussian(r));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(Math.abs(mean)).toBeLessThan(0.06);
    expect(sd).toBeGreaterThan(0.93);
    expect(sd).toBeLessThan(1.07);
  });
});

describe("pot suggestions", () => {
  const easy = [ball("white", 0.85, MID), ball("red1", 1.25, MID)];

  it("finds the straight pot into the middle pocket with a high chance", () => {
    const s = suggestShot(snooker, table, { bodies: easy, targets: reds("red1"), skill: SKILLS.club, seed: 1 })!;
    expect(s.kind).toBe("pot");
    expect(s.target).toBe("red1");
    expect(s.pocket).toBe("mr");
    expect(s.probability).toBeGreaterThanOrEqual(0.75);
    expect(s.expectedValue).toBeGreaterThan(0.5);
  });

  it("gives controls that really pot the ball when played perfectly", () => {
    const s = suggestShot(snooker, table, { bodies: easy, targets: reds("red1"), skill: SKILLS.club, seed: 1 })!;
    const res = snooker.simulate(table, easy, snooker.input.buildShot(s.controls));
    expect(res.events.some((e) => e.type === "pocket" && e.body === "red1")).toBe(true);
  });

  it("is reproducible from a seed", () => {
    const req = { bodies: easy, targets: reds("red1"), skill: SKILLS.beginner, seed: 11 };
    expect(suggestShot(snooker, table, req)).toEqual(suggestShot(snooker, table, req));
  });

  it("only considers the balls it is told are on", () => {
    const bodies = [ball("white", 0.85, MID), ball("red1", 1.25, MID), ball("red2", 1.2, 2.4)];
    const s = suggestShot(snooker, table, { bodies, targets: reds("red2"), skill: SKILLS.club, seed: 1 })!;
    expect(s.target).toBe("red2");
  });

  it("rates a long pot higher for a better player", () => {
    const bodies = [ball("white", 0.39, 1.58), ball("red1", 1.45, 3.1)];
    const req = (skill: (typeof SKILLS)[keyof typeof SKILLS]) => ({ bodies, targets: reds("red1"), skill, seed: 5 });
    const beginner = suggestShot(snooker, table, req(SKILLS.beginner));
    const expert = suggestShot(snooker, table, req(SKILLS.expert));
    expect(expert?.kind).toBe("pot");
    expect(expert!.probability).toBeGreaterThanOrEqual(beginner?.kind === "pot" ? beginner.probability : 0);
  });
});

describe("safety play", () => {
  // The red is jammed against the baulk cushion behind the white: no pocket can be reached from here.
  const stuck = [ball("white", 0.9, 0.3), ball("red1", 0.9, 0.07)];

  it("plays a gentle safety when nothing can be potted", () => {
    const s = suggestShot(snooker, table, { bodies: stuck, targets: reds("red1"), skill: SKILLS.club, seed: 1 })!;
    expect(s.kind).toBe("safety");
    expect(s.pocket).toBeNull();
    expect(s.controls.power).toBeLessThanOrEqual(0.25);
  });

  it("the safety hits the ball on first and pots nothing", () => {
    const s = suggestShot(snooker, table, { bodies: stuck, targets: reds("red1"), skill: SKILLS.club, seed: 1 })!;
    const res = snooker.simulate(table, stuck, snooker.input.buildShot(s.controls));
    const first = res.events.find((e) => e.type === "collision");
    expect(first).toMatchObject({ type: "collision" });
    expect(res.events.some((e) => e.type === "pocket")).toBe(false);
  });
});

describe("full-table positions", () => {
  const start = startingBodies(table);
  const targets = snookerRules.targets!(newFrame(), start);

  it("finds a legal break-off from the opening position, where the brown blocks every direct line", () => {
    const s = suggestShot(snooker, table, { bodies: start, targets, skill: SKILLS.club, seed: 1 });
    expect(s).not.toBeNull();
    expect(s!.kind).toBe("safety");
    const res = snooker.simulate(table, start, snooker.input.buildShot(s!.controls));
    const first = res.events.find((e) => e.type === "collision");
    const hit = first && first.type === "collision" ? (first.a === "white" ? first.b : first.a) : "";
    expect(hit.startsWith("red")).toBe(true);
    expect(res.events.some((e) => e.type === "pocket")).toBe(false);
  }, 60_000);

  it("answers promptly on a busy table (guards against runaway simulations)", () => {
    const scattered = snooker.simulate(table, start, snooker.input.buildShot({ aim: Math.PI / 2 + 0.02, power: 0.8, spinX: 0, spinY: 0 })).final;
    const t0 = performance.now();
    const s = suggestShot(snooker, table, {
      bodies: scattered,
      targets: snookerRules.targets!(newFrame(), scattered),
      skill: SKILLS.club,
      seed: 1,
    });
    expect(s).not.toBeNull();
    expect(performance.now() - t0).toBeLessThan(15_000);
  }, 60_000);
});

describe("edge cases", () => {
  it("returns nothing when the cue ball is potted or no target is on the table", () => {
    const pocketed: Body[] = [{ ...ball("white", 0.9, 0.5), state: "pocketed" }, ball("red1", 1.2, 1.5)];
    expect(suggestShot(snooker, table, { bodies: pocketed, targets: reds("red1"), skill: SKILLS.club })).toBeNull();
    expect(suggestShot(snooker, table, { bodies: [ball("white", 0.9, 0.5)], targets: reds("red1"), skill: SKILLS.club })).toBeNull();
  });
});

describe("perturb", () => {
  const c = { aim: 1, power: 0.5, spinX: 0.1, spinY: -0.1 };

  it("leaves a shot alone for a perfect player", () => {
    expect(perturb(c, { aimSigma: 0, powerSigma: 0, samples: 1 }, makeRng(1))).toEqual(c);
  });

  it("adds noise for an imperfect player but keeps power in range and spin untouched", () => {
    const rng = makeRng(2);
    const outs = Array.from({ length: 200 }, () => perturb({ ...c, power: 0.98 }, SKILLS.beginner, rng));
    expect(outs.some((o) => o.aim !== 1)).toBe(true);
    for (const o of outs) {
      expect(o.power).toBeLessThanOrEqual(1);
      expect(o.power).toBeGreaterThanOrEqual(0.02);
      expect(o.spinX).toBe(0.1);
    }
  });
});

describe("snooker targets for the AI", () => {
  const bodies = startingBodies(table);
  const frame = (o: Partial<FrameState> = {}) => ({ ...newFrame(), ...o });

  it("offers every red while a red is on", () => {
    const t = snookerRules.targets!(frame(), bodies);
    expect(t).toHaveLength(15);
    expect(t.every((x) => x.value === 1)).toBe(true);
  });

  it("offers the colours (or the nominated one) after a red, with their values", () => {
    const colour = frame({ phase: "colour" });
    expect(snookerRules.targets!(colour, bodies).map((t) => t.id)).toEqual(["yellow", "green", "brown", "blue", "pink", "black"]);
    expect(snookerRules.targets!(colour, bodies, "blue")).toEqual([{ id: "blue", value: 5 }]);
  });

  it("offers only the next colour in the clearance, and only the black in the decider", () => {
    expect(snookerRules.targets!(frame({ phase: "clearance", nextColour: 3 }), bodies)).toEqual([{ id: "blue", value: 5 }]);
    expect(snookerRules.targets!(frame({ blackDecider: true, phase: "clearance", nextColour: 5 }), bodies)).toEqual([{ id: "black", value: 7 }]);
  });

  it("skips balls that are off the table", () => {
    const gone = bodies.map((b) => (b.id === "red1" ? { ...b, state: "pocketed" as const } : b));
    expect(snookerRules.targets!(frame(), gone)).toHaveLength(14);
  });
});
