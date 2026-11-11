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
  /** The striker must hit both other balls, touching at least this many cushions before the second. */
  cannon?: { cushions: number };
  /** The striker must go in a pocket after hitting another ball (billiards' losing hazard). */
  inOff?: boolean;
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

/**
 * A short animation in the notes: balls set out on the table, the aim shown for a moment, then the shot played by the
 * same engine as the practice table. Without a shot it is a still picture of the layout.
 */
export interface Demo {
  /** One or two sentences saying what to watch for. Also the animation's accessible description. */
  caption: string;
  layout: LayoutBall[];
  shot?: {
    /**
     * Where the cue ball is sent: to the ghost-ball position that pots `pot` into `pocket`, straight at a ball's
     * centre (`at`), toward a point on the table, or in a fixed direction (degrees; 90 is up the table, away from baulk).
     */
    aim: { pot: string; pocket: string } | { at: string } | { toward: { x: number; y: number } } | { deg: number };
    /** Fraction of the game's maximum speed. */
    power: number;
    /** Tip offset in fractions of the ball's radius: x is right of centre, y is above. */
    spin?: { x?: number; y?: number };
  };
  /** Also draw the predicted paths before the shot, with the angle marks. */
  showPath?: boolean;
  /** A target circle on the cloth, e.g. where the cue ball should finish. */
  zone?: { x: number; y: number; radius: number };
  /** The shot is meant to miss the pot it is aimed at (to show an error). Tests check every other `pot` aim goes in. */
  misses?: boolean;
  /** The striker is meant to drop, e.g. an in-off in billiards or the 20 hole in crokinole. Tests check it does not otherwise. */
  strikerPots?: boolean;
  /** Balls the shot must pot, for aims other than `pot`. Checked by tests. */
  pots?: string[];
  /** The striker should hit both other balls, touching at least this many cushions before the second. Checked by tests. */
  cannon?: number;
}

/** One part of a lesson's written notes. */
export interface NoteSection {
  heading: string;
  /** Paragraphs of text. */
  body: string[];
  /** Key points, shown as a list after the paragraphs. */
  points?: string[];
  demo?: Demo;
}

/** Notes to read, animated examples, links out to videos (not embedded) and a task for a real table. */
export interface WatchLesson extends LessonBase {
  kind: "watch";
  /** The written lesson, read before the videos. */
  notes?: NoteSection[];
  /** Further viewing; may be empty when the notes stand alone. */
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
