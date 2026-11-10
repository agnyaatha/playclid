import type { ProgressEntry } from "../progress/store";
import type { DrillLesson, Lesson } from "./schema";

export interface LessonStats {
  lessonId: string;
  title: string;
  plays: number;
  bestStars: number;
  /** Share of practice attempts (aids on, fading) that were made, averaged over every play. 0 to 1. */
  aidedRate: number;
  /** Share of the no-aid test attempts that were made. 0 to 1. */
  unaidedRate: number;
}

export interface OverallStats {
  plays: number;
  aidedRate: number | null;
  unaidedRate: number | null;
  /** Unaided minus aided, in percentage points: negative means you do worse without the aids. */
  gap: number | null;
}

/**
 * Summarise drill history: how often shots were made with the aids on versus on the no-aid test shots. Rates are
 * pooled over attempts, so a long lesson counts for more than a short one. Watch lessons carry no shot data.
 */
export function computeStats(entries: readonly ProgressEntry[], lessons: readonly Lesson[]) {
  const drills = new Map<string, DrillLesson>();
  for (const l of lessons) if (l.kind === "drill") drills.set(l.id, l);

  const per = new Map<string, { plays: number; stars: number; aidedMade: number; aidedTotal: number; testMade: number; testTotal: number }>();
  let aidedMade = 0;
  let aidedTotal = 0;
  let testMade = 0;
  let testTotal = 0;
  let plays = 0;

  for (const e of entries) {
    const lesson = drills.get(e.lessonId);
    if (!lesson || e.kind !== "drill") continue;
    const made = Math.min(e.score, e.attempts);
    const testMadeHere = Math.min(e.testScore, lesson.testAttempts);
    const aidedMadeHere = Math.max(0, made - testMadeHere);
    const cur = per.get(e.lessonId) ?? { plays: 0, stars: 0, aidedMade: 0, aidedTotal: 0, testMade: 0, testTotal: 0 };
    cur.plays += 1;
    cur.stars = Math.max(cur.stars, e.stars);
    cur.aidedMade += aidedMadeHere;
    cur.aidedTotal += lesson.practiceAttempts;
    cur.testMade += testMadeHere;
    cur.testTotal += lesson.testAttempts;
    per.set(e.lessonId, cur);
    aidedMade += aidedMadeHere;
    aidedTotal += lesson.practiceAttempts;
    testMade += testMadeHere;
    testTotal += lesson.testAttempts;
    plays += 1;
  }

  const lessonsOut: LessonStats[] = [...per.entries()].map(([id, c]) => ({
    lessonId: id,
    title: drills.get(id)!.title,
    plays: c.plays,
    bestStars: c.stars,
    aidedRate: c.aidedTotal ? c.aidedMade / c.aidedTotal : 0,
    unaidedRate: c.testTotal ? c.testMade / c.testTotal : 0,
  }));

  const aided = aidedTotal ? aidedMade / aidedTotal : null;
  const unaided = testTotal ? testMade / testTotal : null;
  const overall: OverallStats = {
    plays,
    aidedRate: aided,
    unaidedRate: unaided,
    gap: aided !== null && unaided !== null ? Math.round((unaided - aided) * 100) : null,
  };
  return { lessons: lessonsOut, overall };
}
