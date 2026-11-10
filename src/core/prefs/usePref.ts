"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { prefsStore } from "./store";

/**
 * A preference that persists on this device. Renders `initial` on the server and until hydration, then the stored
 * value. `valid` rejects stored values of the wrong shape (e.g. from an older version), falling back to `initial`.
 */
export function usePref<T>(name: string, initial: T, valid?: (v: unknown) => v is T): [T, (v: T) => void] {
  const raw = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, () => "{}");
  const value = useMemo(() => {
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      return name in o && (!valid || valid(o[name])) ? (o[name] as T) : initial;
    } catch {
      return initial;
    }
  }, [raw, name, initial, valid]);
  const set = useCallback((v: T) => prefsStore.set(name, v), [name]);
  return [value, set];
}
