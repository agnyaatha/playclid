import type { Game, GameId } from "@/core/game";
import type { Challenge } from "@/core/lessons/challenges";
import type { Lesson } from "@/core/lessons/schema";
import type { GameTheme } from "@/views/2d/theme";
import { billiards, billiardsLessons } from "./billiards";
import { carrom } from "./carrom";
import { carromChallenges } from "./carrom/challenges";
import { carromLessons } from "./carrom/lessons";
import { carromTheme } from "./carrom/theme";
import { crokinole, crokinoleLessons, crokinoleTheme } from "./crokinole";
import { nineball } from "./nineball";
import { nineChallenges, nineLessons } from "./nineball/content";
import { pool } from "./pool";
import { poolChallenges } from "./pool/challenges";
import { poolLessons } from "./pool/lessons";
import { poolTheme } from "./pool/theme";
import { shuffleboard, shuffleboardTheme, shuffleLessons } from "./shuffleboard";
import { snooker } from "./snooker";
import { snookerChallenges } from "./snooker/challenges";
import { snookerLessons } from "./snooker/lessons";
import { snookerTheme } from "./snooker/theme";
import { threecushion, threeCushionLessons, threeCushionTheme } from "./threecushion";

export interface GameEntry {
  game: Game;
  theme: GameTheme;
  lessons: Lesson[];
  challenges: Challenge[];
  /** One line for the home page. */
  blurb: string;
}

/** Add new games here, and to a family below; the shared UI looks games up by id and needs nothing else. */
export const GAMES: Partial<Record<GameId, GameEntry>> = {
  snooker: { game: snooker, theme: snookerTheme, lessons: snookerLessons, challenges: snookerChallenges, blurb: "The full game on a true 12 ft table: from stance and straight pots to breaks, safety and escapes." },
  billiards: { game: billiards, theme: snookerTheme, lessons: billiardsLessons, challenges: [], blurb: "Three balls on a snooker table, scoring from pots, in-offs and cannons." },
  threecushion: { game: threecushion, theme: threeCushionTheme, lessons: threeCushionLessons, challenges: [], blurb: "No pockets. Hit both balls, with three cushions before the second." },
  pool: { game: pool, theme: poolTheme, lessons: poolLessons, challenges: poolChallenges, blurb: "8-ball on a 9 ft table: potting angles, cue-ball control and ball in hand." },
  nineball: { game: nineball, theme: poolTheme, lessons: nineLessons, challenges: nineChallenges, blurb: "Rotation pool. Lowest ball first, and whoever pots the 9 wins." },
  carrom: { game: carrom, theme: carromTheme, lessons: carromLessons, challenges: carromChallenges, blurb: "Flick the striker from the baseline and pocket your colour, on a powdered board." },
  crokinole: { game: crokinole, theme: crokinoleTheme, lessons: crokinoleLessons, challenges: [], blurb: "Flick discs round the pegs on a round board, aiming for the 20 hole." },
  shuffleboard: { game: shuffleboard, theme: shuffleboardTheme, lessons: shuffleLessons, challenges: [], blurb: "Slide pucks down a long table and stop them as near the edge as you dare." },
};

/** How the games are grouped wherever they are listed. */
export const FAMILIES: { title: string; ids: GameId[] }[] = [
  { title: "Snooker and billiards", ids: ["snooker", "billiards", "threecushion"] },
  { title: "Pool", ids: ["pool", "nineball"] },
  { title: "Disc and board games", ids: ["carrom", "crokinole", "shuffleboard"] },
];

/** Look up a game from a URL segment; null when it is unknown or not registered yet. */
export function findGame(id: string): (GameEntry & { id: GameId }) | null {
  const entry = GAMES[id as GameId];
  return entry ? { ...entry, id: id as GameId } : null;
}

export function getGame(id: GameId): GameEntry {
  const entry = GAMES[id];
  if (!entry) throw new Error(`Game "${id}" is not registered`);
  return entry;
}
