import { describe, expect, it } from "vitest";
import { snooker, snookerShot } from "@/games/snooker";
import { impactGain } from "@/ui/fx/sound";
import { ballName, greatShot, milestoneCrossed, milestoneTitle, recordShot, shotVerdict, summariseSession, type ShotRecord } from "./insight";

const table = snooker.createTable();
const ball = (id: string, x: number, y: number) => snooker.createBody(id, x, y);
const shot = (aim: number, speed = 3) => snookerShot({ aim, speed, sideOffset: 0, vertOffset: 0 });
const cloth = snooker.params.cloth;

describe("milestones", () => {
  it("reports the highest milestone passed, and only once", () => {
    expect(milestoneCrossed(8, 12)).toBe(10);
    expect(milestoneCrossed(10, 12)).toBeNull();
    expect(milestoneCrossed(5, 35)).toBe(30);
    expect(milestoneCrossed(99, 100)).toBe(100);
  });

  it("names the big ones", () => {
    expect(milestoneTitle(50)).toBe("Break of 50");
    expect(milestoneTitle(100)).toBe("Century!");
    expect(milestoneTitle(147)).toBe("Maximum!");
  });
});

describe("shot insight", () => {
  it("names balls the way a player would", () => {
    expect(ballName("red7")).toBe("red");
    expect(ballName("blue")).toBe("blue");
    expect(ballName("w3")).toBe("white coin");
  });

  it("measures the cut of a full-ball contact as zero", () => {
    const b = [ball("white", 0.9, 0.4), ball("red1", 0.9, table.length - 0.4)];
    const v = shotVerdict(snooker.simulate(table, b, shot(Math.PI / 2, 4)), "white", table, cloth);
    expect(v.text).toMatch(/\b0° cut/);
  });

  it("reports a pot, and does not call a short one great", () => {
    const y = table.length / 2;
    const b = [ball("white", 0.9, y), ball("red1", table.width - 0.4, y)];
    // Nearly a stun shot: a full draw would run the white straight back into the opposite middle pocket.
    const res = snooker.simulate(table, b, snookerShot({ aim: 0, speed: 1.5, sideOffset: 0, vertOffset: -0.12 }));
    expect(res.events.some((e) => e.type === "pocket" && e.body === "red1")).toBe(true);
    expect(greatShot(res, "white", table)).toBeNull();
    expect(shotVerdict(res, "white", table, cloth)).toMatchObject({ tone: "good" });
    expect(shotVerdict(res, "white", table, cloth).text).toMatch(/Potted the red/);
  });

  it("calls a pot from far away a long pot", () => {
    const pocket = table.pockets.find((p) => p.position.x < 1e-6 && p.position.y > table.length - 1e-6)!;
    const red = { x: pocket.position.x + 0.15, y: pocket.position.y - 0.15 };
    const white = { x: red.x + 1.05, y: red.y - 1.05 };
    const aim = Math.atan2(red.y - white.y, red.x - white.x);
    const b = [ball("white", white.x, white.y), ball("red1", red.x, red.y)];
    const res = snooker.simulate(table, b, snookerShot({ aim, speed: 3, sideOffset: 0, vertOffset: -0.5 }));
    expect(res.events.some((e) => e.type === "pocket" && e.body === "red1")).toBe(true);
    expect(greatShot(res, "white", table)).toBe("Long pot!");
  });

  it("says when nothing was touched", () => {
    const res = snooker.simulate(table, [ball("white", 0.9, 1)], shot(Math.PI / 2, 1));
    expect(shotVerdict(res, "white", table, cloth)).toMatchObject({ tone: "bad" });
  });
});

describe("session summary", () => {
  const row = (o: Partial<ShotRecord>): ShotRecord => ({ player: 0, contact: true, pots: [], long: false, breakAfter: 0, ...o });

  it("is empty before any shot", () => {
    expect(summariseSession([])).toEqual({ shots: 0, pots: 0, potRate: null, longRate: null, highBreak: 0 });
  });

  it("counts pot and long-pot rates over shots that reached a ball", () => {
    const s = summariseSession([row({ pots: ["red1"], breakAfter: 1 }), row({ long: true }), row({ long: true, pots: ["red2"], breakAfter: 9 }), row({ contact: false })]);
    expect(s).toMatchObject({ shots: 4, pots: 2, highBreak: 9 });
    expect(s.potRate).toBeCloseTo(2 / 3, 9);
    expect(s.longRate).toBeCloseTo(1 / 2, 9);
  });

  it("can be limited to one player", () => {
    const log = [row({ pots: ["red1"] }), row({ player: 1, breakAfter: 30 })];
    expect(summariseSession(log, 0)).toMatchObject({ shots: 1, highBreak: 0 });
  });

  it("ignores balls potted on a foul", () => {
    const table2 = snooker.createTable();
    const res = snooker.simulate(table2, [ball("white", 0.9, 1), ball("red1", 0.9, 1.6)], shot(Math.PI / 2, 2));
    expect(recordShot(res, "white", table2, { player: 0, foul: true, breakAfter: 0 }).pots).toEqual([]);
  });
});

describe("impact sound level", () => {
  it("rises with speed and levels off", () => {
    expect(impactGain(0)).toBe(0);
    expect(impactGain(1)).toBeLessThan(impactGain(3));
    expect(impactGain(50)).toBe(1);
  });
});
