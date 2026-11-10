"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GameId } from "../game";
import { progressStore, SERVER_SNAPSHOT, summarise, type ProgressEntry, type ProgressStore } from "./store";

/** Live progress for one game (or all), rendering empty on the server and filling in after hydration. */
export function useProgress(gameId?: GameId, store: ProgressStore = progressStore) {
  const entries = useSyncExternalStore<readonly ProgressEntry[]>(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  const byLesson = useMemo(() => summarise(entries, gameId), [entries, gameId]);
  return { entries, byLesson, save: store.save.bind(store), clear: store.clear.bind(store) };
}
