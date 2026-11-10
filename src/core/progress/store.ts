import type { GameId } from "../game";

export interface ProgressEntry {
  gameId: GameId;
  lessonId: string;
  kind: "drill" | "watch" | "break";
  /** Successful attempts (drills), break points (break drills); 0 for watch lessons. */
  score: number;
  /** Successful attempts among the no-aid test attempts. */
  testScore: number;
  attempts: number;
  stars: number;
  at: number;
}

/**
 * A progress store in the shape React's useSyncExternalStore wants, so the local implementation can later be
 * swapped for a backend-backed one without touching the UI. `getSnapshot` must return the same array until the
 * data changes.
 */
export interface ProgressStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly ProgressEntry[];
  save(entry: ProgressEntry): void;
  clear(): void;
}

export interface LessonProgress {
  plays: number;
  bestStars: number;
  bestScore: number;
  bestTestScore: number;
  /** Watch lessons count as done once marked; drills once they earn at least one star. */
  completed: boolean;
  lastAt: number;
}

/** Collapse the entry history into one summary per lesson. */
export function summarise(entries: readonly ProgressEntry[], gameId?: GameId): Map<string, LessonProgress> {
  const out = new Map<string, LessonProgress>();
  for (const e of entries) {
    if (gameId && e.gameId !== gameId) continue;
    const cur = out.get(e.lessonId) ?? { plays: 0, bestStars: 0, bestScore: 0, bestTestScore: 0, completed: false, lastAt: 0 };
    cur.plays += 1;
    cur.bestStars = Math.max(cur.bestStars, e.stars);
    cur.bestScore = Math.max(cur.bestScore, e.score);
    cur.bestTestScore = Math.max(cur.bestTestScore, e.testScore);
    cur.completed ||= e.kind === "watch" || e.stars > 0;
    cur.lastAt = Math.max(cur.lastAt, e.at);
    out.set(e.lessonId, cur);
  }
  return out;
}

const EMPTY: readonly ProgressEntry[] = [];

/** localStorage is small; keep the most recent results and let the oldest fall away. */
const MAX_ENTRIES = 2000;

function isEntry(x: unknown): x is ProgressEntry {
  const e = x as Partial<ProgressEntry> | null;
  return !!e && typeof e.lessonId === "string" && typeof e.gameId === "string" && typeof e.at === "number";
}

/** localStorage-backed store. Falls back to memory when storage is unavailable (private windows, blocked data). */
export class LocalProgressStore implements ProgressStore {
  private entries: readonly ProgressEntry[] = EMPTY;
  private loaded = false;
  private listeners = new Set<() => void>();

  constructor(private key = "sim-pool:progress") {}

  private load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.key) ?? "[]");
      this.entries = Array.isArray(raw) ? raw.filter(isEntry) : EMPTY;
    } catch {
      /* unreadable or unavailable: keep whatever is in memory */
    }
    this.loaded = true;
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === this.key || e.key === null) {
        this.load();
        listener();
      }
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(listener);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  };

  getSnapshot = () => {
    if (!this.loaded) this.load();
    return this.entries;
  };

  save(entry: ProgressEntry) {
    if (!this.loaded) this.load();
    this.entries = [...this.entries, entry].slice(-MAX_ENTRIES);
    this.persist();
  }

  clear() {
    this.entries = EMPTY;
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.entries));
    } catch {
      /* storage unavailable: progress lasts for this session only */
    }
    this.emit();
  }
}

export const progressStore: ProgressStore = new LocalProgressStore();
export const SERVER_SNAPSHOT = EMPTY;
