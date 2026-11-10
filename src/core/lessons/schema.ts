import type { GameId } from "../game";

export type AidName = "aimLine" | "ghostBall" | "prediction";

/** A ball placed by table coordinates, or on a named spot the game knows (e.g. "black"). */
export type LayoutBall = { id: string; x: number; y: number } | { id: string; spot: string };

export interface Video {
  title: string;
  url: string;
  /** e.g. "P" for pool-only material. */
  tags?: string[];
}

interface LessonBase {
  id: string;
  gameId: GameId;
  /** Curriculum module this belongs to, e.g. "3". Lessons sort by module then order. */
  module: string;
  moduleTitle: string;
  order: number;
  title: string;
  goal: string;
}

/** What counts as a successful attempt. Every condition given must hold. */
export interface SuccessCriteria {
  /** The target ball must be potted (optionally only in the listed pockets) without potting the striker. */
  pot?: { ball: string; pockets?: string[] };
  /** The striker must finish inside this circle (table coordinates, metres). */
  zone?: { x: number; y: number; radius: number };
}

/** A hands-on drill on the simulated table. */
export interface DrillLesson extends LessonBase {
  kind: "drill";
  layout: LayoutBall[];
  /** Aids offered while practising; they fade across the practice attempts and are off for the test attempts. */
  aids: AidName[];
  practiceAttempts: number;
  /** Final attempts with no aids, to measure what has stuck. */
  testAttempts: number;
  success: SuccessCriteria;
  /** Successes needed for one, two and three stars. */
  stars: [number, number, number];
  tips?: string[];
  video?: Video;
}

/** Watch-and-practise material with links out to videos (not embedded). */
export interface WatchLesson extends LessonBase {
  kind: "watch";
  videos: Video[];
  /** What to do at a real table after watching. */
  practice?: string;
}

/**
 * A scored visit to the table: play on by the game's rules until the turn ends, and your break (points in one visit)
 * decides the stars. Used for clearing the colours or building a break from a set-up position.
 */
export interface BreakLesson extends LessonBase {
  kind: "break";
  layout: LayoutBall[];
  /** Reds still on the table at the start (snooker: 0 starts the colour clearance). */
  redsLeft: number;
  /** Break points needed for one, two and three stars. */
  stars: [number, number, number];
  tips?: string[];
}

export type Lesson = DrillLesson | WatchLesson | BreakLesson;
