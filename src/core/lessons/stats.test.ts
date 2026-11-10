import { describe, expect, it } from "vitest";
import type { ProgressEntry } from "../progress/store";
import { computeStats } from "./stats";
import { snookerLessons } from "@/games/snooker/lessons";

// m3-straight-short: 6 practice attempts, 4 test attempts.
const entry = (o: Partial<ProgressEntry> = {}): ProgressEntry => ({
  gameId: "snooker",
  lessonId: "m3-straight-short",
  kind: "drill",
  score: 8,
  testScore: 2,
  attempts: 10,
  stars: 3,
  at: 1,
  ...o,
});

describe("computeStats", () => {
  it("separates aided and unaided success: 6 made of 6 practice, 2 of 4 test", () => {
    const { lessons, overall } = computeStats([entry({ score: 8, testScore: 2 })], snookerLessons);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].aidedRate).toBeCloseTo(1, 9);
    expect(lessons[0].unaidedRate).toBeCloseTo(0.5, 9);
    expect(overall.gap).toBe(-50);
  });

  it("pools attempts across plays", () => {
    const { overall } = computeStats([entry({ score: 8, testScore: 2 }), entry({ score: 4, testScore: 0, stars: 0 })], snookerLessons);
    // Aided: 6 + 4 made of 12; unaided: 2 of 8.
    expect(overall.aidedRate).toBeCloseTo(10 / 12, 9);
    expect(overall.unaidedRate).toBeCloseTo(2 / 8, 9);
    expect(overall.plays).toBe(2);
  });

  it("keeps the best star rating per lesson", () => {
    const { lessons } = computeStats([entry({ stars: 1 }), entry({ stars: 3 }), entry({ stars: 2 })], snookerLessons);
    expect(lessons[0].bestStars).toBe(3);
  });

  it("ignores watch lessons and unknown lessons", () => {
    const { lessons, overall } = computeStats(
      [entry({ lessonId: "m0-watch", kind: "watch", score: 0, testScore: 0, attempts: 0 }), entry({ lessonId: "gone" })],
      snookerLessons,
    );
    expect(lessons).toHaveLength(0);
    expect(overall).toEqual({ plays: 0, aidedRate: null, unaidedRate: null, gap: null });
  });

  it("copes with inconsistent stored data without going out of range", () => {
    const { lessons } = computeStats([entry({ score: 99, testScore: 99, attempts: 10 })], snookerLessons);
    expect(lessons[0].aidedRate).toBeGreaterThanOrEqual(0);
    expect(lessons[0].unaidedRate).toBeLessThanOrEqual(1);
  });
});
