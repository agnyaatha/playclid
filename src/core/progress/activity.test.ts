import { describe, expect, it } from "vitest";
import { addShot, badges, currentStreak, dayKey, EMPTY_ACTIVITY, isActivity } from "./activity";

describe("practice activity", () => {
  it("formats local dates with padding", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds shots, pots and the best break", () => {
    const a = addShot(addShot(EMPTY_ACTIVITY, "2026-03-01", 1, 8), "2026-03-01", 0, 3);
    expect(a).toMatchObject({ shots: 2, pots: 1, bestBreak: 8, days: { "2026-03-01": 2 } });
  });

  it("counts a streak across days and months", () => {
    let a = EMPTY_ACTIVITY;
    for (const d of ["2026-02-27", "2026-02-28", "2026-03-01"]) a = addShot(a, d, 0, 0);
    expect(currentStreak(a, "2026-03-01")).toBe(3);
    expect(a.bestStreak).toBe(3);
  });

  it("keeps a streak alive until the day has passed, then ends it", () => {
    const a = addShot(EMPTY_ACTIVITY, "2026-03-01", 0, 0);
    expect(currentStreak(a, "2026-03-02")).toBe(1);
    expect(currentStreak(a, "2026-03-03")).toBe(0);
  });

  it("earns badges from the totals", () => {
    const earned = badges({ ...EMPTY_ACTIVITY, pots: 1, bestBreak: 55 }).filter((b) => b.earned).map((b) => b.name);
    expect(earned).toEqual(["First pot", "Twenty break", "Half century"]);
  });

  it("rejects stored data of the wrong shape", () => {
    expect(isActivity({ days: {}, shots: "x" })).toBe(false);
    expect(isActivity(EMPTY_ACTIVITY)).toBe(true);
  });
});
