import type { Game } from "../game";
import type { Body, ShotResult, Table } from "../types";
import { scanCannon } from "./cannon";
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
  const scan = scanCannon(result, strikerId);
  const scratchWanted = !!lesson.success.inOff || pot?.ball === strikerId;
  if (scratch && !scratchWanted) reasons.push("The cue ball was potted.");

  const inOffMade = !lesson.success.inOff || (!!scratch && scan.hit.length > 0);
  if (!inOffMade) reasons.push("The cue ball did not go in off a ball.");

  const { cannon } = lesson.success;
  const cannonMade = !cannon || (scan.made && scan.cushions >= cannon.cushions);
  if (!cannonMade) reasons.push(scan.made ? `It needed ${cannon!.cushions} cushions before the second ball, and touched ${scan.cushions}.` : "The cue ball did not hit both balls.");

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

  return { success: potted && (!scratch || scratchWanted) && inZone && inOffMade && cannonMade, potted: !!pot && potted, scratch: !!scratch, zoneDistance, reasons };
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
    if (lesson.videos.length === 0 && !lesson.notes?.length) problems.push("watch lesson has neither notes nor videos");
    for (const v of lesson.videos) if (!/^https:\/\//.test(v.url)) problems.push(`video "${v.title}" has a non-https url`);
    for (const section of lesson.notes ?? []) {
      if (section.body.length === 0) problems.push(`notes "${section.heading}" have no text`);
      const demo = section.demo;
      if (!demo) continue;
      const { bodies, problems: found } = layoutProblems(game, table, { id: demo.caption, layout: demo.layout });
      problems.push(...found.map((p) => `demo in "${section.heading}": ${p}`));
      const aim = demo.shot?.aim;
      if (aim && "pot" in aim && !table.pockets.some((k) => k.id === aim.pocket)) problems.push(`demo in "${section.heading}": unknown pocket "${aim.pocket}"`);
      const id = aim && ("pot" in aim ? aim.pot : "at" in aim ? aim.at : null);
      if (id && !bodies.some((b) => b.id === id)) problems.push(`demo in "${section.heading}": ball "${id}" is not in the layout`);
    }
    return problems;
  }

  return validateLayout(game, table, lesson);
}

/** Ids, bounds and overlaps of a layout of balls. */
function layoutProblems(game: Game, table: Table, lesson: Pick<DrillLesson, "layout" | "id">): { bodies: Body[]; problems: string[] } {
  const problems: string[] = [];
  let bodies: Body[] = [];
  try {
    bodies = buildLessonBodies(game, table, lesson);
  } catch (e) {
    return { bodies, problems: [(e as Error).message] };
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
  return { bodies, problems };
}

/** Checks shared by every lesson that sets up balls: ids, bounds and overlaps, plus kind-specific rules. */
function validateLayout(game: Game, table: Table, lesson: DrillLesson | BreakLesson): string[] {
  const { bodies, problems } = layoutProblems(game, table, lesson);
  if (bodies.length === 0) return problems;
  const ids = new Set(bodies.map((b) => b.id));
  if (lesson.kind === "break") {
    if (!(lesson.stars[0] > 0 && lesson.stars[0] <= lesson.stars[1] && lesson.stars[1] <= lesson.stars[2])) {
      problems.push("break star thresholds must be positive and ascending");
    }
    if (lesson.redsLeft < 0) problems.push("redsLeft cannot be negative");
    if (!game.rules) problems.push("break lessons need a game with rules");
    return problems;
  }
  const { pot, zone, cannon, inOff } = lesson.success;
  if (!pot && !zone && !cannon && !inOff) problems.push("no success criteria");
  if (pot && !ids.has(pot.ball)) problems.push(`target ball "${pot.ball}" is not in the layout`);
  if (pot?.pockets) for (const p of pot.pockets) if (!table.pockets.some((k) => k.id === p)) problems.push(`unknown pocket "${p}"`);
  if (lesson.practiceAttempts < 1 || lesson.testAttempts < 0) problems.push("bad attempt counts");
  const total = totalAttempts(lesson);
  if (!(lesson.stars[0] <= lesson.stars[1] && lesson.stars[1] <= lesson.stars[2] && lesson.stars[2] <= total)) {
    problems.push("star thresholds must be ascending and not exceed the attempts");
  }
  return problems;
}
