"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { track } from "@/core/analytics/track";
import type { GameId } from "../game";
import { progressStore, SERVER_SNAPSHOT, summarise, type ProgressEntry, type ProgressStore } from "./store";

/** Live progress for one game (or all), rendering empty on the server and filling in after hydration. */
export function useProgress(gameId?: GameId, store: ProgressStore = progressStore) {
  const entries = useSyncExternalStore<readonly ProgressEntry[]>(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  const byLesson = useMemo(() => summarise(entries, gameId), [entries, gameId]);
  const save = useCallback(
    (entry: ProgressEntry) => {
      store.save(entry);
      track("activity_complete", { kind: entry.kind, activity_id: entry.lessonId, stars: entry.stars });
    },
    [store],
  );
  return { entries, byLesson, save, clear: store.clear.bind(store) };
}
