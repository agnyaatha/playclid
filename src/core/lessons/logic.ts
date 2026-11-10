import type { Game } from "../game";
import type { Body, ShotResult, Table } from "../types";
import type { AidName, BreakLesson, DrillLesson, Lesson } from "./schema";

export const totalAttempts = (l: DrillLesson) => l.practiceAttempts + l.testAttempts;

/**
 * Aids offered on attempt `index` (0-based). During practice they fade one at a time from the last listed aid
 * backwards, spread evenly across the practice attempts; test attempts have none.
 */
export function aidsForAttempt(lesson: DrillLesson, index: number): AidName[] {
  if (index >= lesson.practiceAttempts) return [];
  const n = lesson.aids.length;
  const dropped = Math.floor((index * n) / Math.max(1, lesson.practiceAttempts));
  return lesson.aids.slice(0, n - dropped);
}

export const isTestAttempt = (lesson: DrillLesson, index: number) => index >= lesson.practiceAttempts;

export interface AttemptOutcome {
  success: boolean;
  /** Target ball was potted. */
  potted: boolean;
  /** The striker was potted. */
  scratch: boolean;
  /** Distance from the striker's final position to the target zone centre, when a zone is required. */
  zoneDistance: number | null;
  /** Human-readable reasons for a miss. */
  reasons: string[];
}

export function evaluateShot(lesson: DrillLesson, result: ShotResult, strikerId: string): AttemptOutcome {
  const { pot, zone } = lesson.success;
  const striker = result.final.find((b) => b.id === strikerId);
  const scratch = striker?.state === "pocketed";
  const reasons: string[] = [];

  let potted = true;
  if (pot) {
    potted = result.events.some(
      (e) => e.type === "pocket" && e.body === pot.ball && (!pot.pockets || pot.pockets.includes(e.pocket)),
    );
    if (!potted) {
      const wrongPocket = result.events.some((e) => e.type === "pocket" && e.body === pot.ball);
      reasons.push(wrongPocket ? "The ball went in the wrong pocket." : "The ball was not potted.");
    }
  }
  if (scratch) reasons.push("The cue ball was potted.");

  let zoneDistance: number | null = null;
  let inZone = true;
  if (zone) {
    if (!striker || scratch) {
      inZone = false;
    } else {
      zoneDistance = Math.hypot(striker.position.x - zone.x, striker.position.y - zone.y);
      inZone = zoneDistance <= zone.radius;
      if (!inZone) reasons.push(`The cue ball finished ${(zoneDistance - zone.radius).toFixed(2)} m outside the target.`);
    }
  }

  return { success: potted && !scratch && inZone, potted: !!pot && potted, scratch: !!scratch, zoneDistance, reasons };
}

export function starsFor(lesson: DrillLesson, successes: number): 0 | 1 | 2 | 3 {
  const [one, two, three] = lesson.stars;
  return successes >= three ? 3 : successes >= two ? 2 : successes >= one ? 1 : 0;
}

/** Resolve a lesson layout into bodies using the game's ball factory and named spots. */
export function buildLessonBodies(game: Game, table: Table, lesson: Pick<DrillLesson | BreakLesson, "layout" | "id">): Body[] {
  const spots = game.spots?.(table) ?? {};
  return lesson.layout.map((b) => {
    if ("spot" in b) {
      const s = spots[b.spot];
      if (!s) throw new Error(`Lesson ${lesson.id}: unknown spot "${b.spot}"`);
      return game.createBody(b.id, s.x, s.y);
    }
    return game.createBody(b.id, b.x, b.y);
  });
}

/** Authoring checks: returns a list of problems (empty when the lesson is sound). */
export function validateLesson(game: Game, table: Table, lesson: Lesson): string[] {
  const problems: string[] = [];
  if (lesson.kind === "watch") {
    if (lesson.videos.length === 0) problems.push("watch lesson has no videos");
    for (const v of lesson.videos) if (!/^https:\/\//.test(v.url)) problems.push(`video "${v.title}" has a non-https url`);
    return problems;
  }

  return validateLayout(game, table, lesson);
}

/** Checks shared by every lesson that sets up balls: ids, bounds and overlaps, plus kind-specific rules. */
function validateLayout(game: Game, table: Table, lesson: DrillLesson | BreakLesson): string[] {
  const problems: string[] = [];
  let bodies: Body[] = [];
  try {
    bodies = buildLessonBodies(game, table, lesson);
  } catch (e) {
    return [(e as Error).message];
  }
  const ids = new Set(bodies.map((b) => b.id));
  if (ids.size !== bodies.length) problems.push("duplicate ball ids");
  if (!ids.has(game.input.strikerId)) problems.push(`layout has no striker "${game.input.strikerId}"`);
  for (const b of bodies) {
    const { x, y } = b.position;
    if (x < b.radius || x > table.width - b.radius || y < b.radius || y > table.length - b.radius) {
      problems.push(`${b.id} is outside the table`);
    }
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(bodies[i].position.x - bodies[j].position.x, bodies[i].position.y - bodies[j].position.y);
      if (d < bodies[i].radius + bodies[j].radius) problems.push(`${bodies[i].id} overlaps ${bodies[j].id}`);
    }
  }
  if (lesson.kind === "break") {
    if (!(lesson.stars[0] > 0 && lesson.stars[0] <= lesson.stars[1] && lesson.stars[1] <= lesson.stars[2])) {
      problems.push("break star thresholds must be positive and ascending");
    }
    if (lesson.redsLeft < 0) problems.push("redsLeft cannot be negative");
    if (!game.rules) problems.push("break lessons need a game with rules");
    return problems;
  }
  const { pot, zone } = lesson.success;
  if (!pot && !zone) problems.push("no success criteria");
  if (pot && !ids.has(pot.ball)) problems.push(`target ball "${pot.ball}" is not in the layout`);
  if (pot?.pockets) for (const p of pot.pockets) if (!table.pockets.some((k) => k.id === p)) problems.push(`unknown pocket "${p}"`);
  if (lesson.practiceAttempts < 1 || lesson.testAttempts < 0) problems.push("bad attempt counts");
  const total = totalAttempts(lesson);
  if (!(lesson.stars[0] <= lesson.stars[1] && lesson.stars[1] <= lesson.stars[2] && lesson.stars[2] <= total)) {
    problems.push("star thresholds must be ascending and not exceed the attempts");
  }
  return problems;
}
