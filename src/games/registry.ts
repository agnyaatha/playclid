import type { Game, GameId } from "@/core/game";
import type { Lesson } from "@/core/lessons/schema";
import type { GameTheme } from "@/views/2d/theme";
import { carrom } from "./carrom";
import { carromLessons } from "./carrom/lessons";
import { carromTheme } from "./carrom/theme";
import { pool } from "./pool";
import { poolLessons } from "./pool/lessons";
import { poolTheme } from "./pool/theme";
import { snooker } from "./snooker";
import { snookerLessons } from "./snooker/lessons";
import { snookerTheme } from "./snooker/theme";

export interface GameEntry {
  game: Game;
  theme: GameTheme;
  lessons: Lesson[];
}

/** Add new games here; the shared UI looks games up by id and needs nothing else. */
export const GAMES: Partial<Record<GameId, GameEntry>> = {
  snooker: { game: snooker, theme: snookerTheme, lessons: snookerLessons },
  pool: { game: pool, theme: poolTheme, lessons: poolLessons },
  carrom: { game: carrom, theme: carromTheme, lessons: carromLessons },
};

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
