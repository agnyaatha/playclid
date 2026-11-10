import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalProgressStore, summarise, type ProgressEntry } from "./store";

const entry = (o: Partial<ProgressEntry> = {}): ProgressEntry => ({
  gameId: "snooker",
  lessonId: "m3-straight-short",
  kind: "drill",
  score: 5,
  testScore: 2,
  attempts: 10,
  stars: 1,
  at: 1,
  ...o,
});

describe("summarise", () => {
  it("keeps the best result per lesson and counts plays", () => {
    const s = summarise([entry({ stars: 1, score: 5 }), entry({ stars: 3, score: 9, testScore: 4, at: 2 }), entry({ stars: 2, score: 7, at: 3 })]);
    const p = s.get("m3-straight-short")!;
    expect(p).toMatchObject({ plays: 3, bestStars: 3, bestScore: 9, bestTestScore: 4, completed: true, lastAt: 3 });
  });

  it("does not count a zero-star drill as completed, but does count a watch lesson", () => {
    const s = summarise([entry({ stars: 0, score: 1 }), entry({ lessonId: "m0-watch", kind: "watch", stars: 0, score: 0 })]);
    expect(s.get("m3-straight-short")!.completed).toBe(false);
    expect(s.get("m0-watch")!.completed).toBe(true);
  });

  it("filters by game", () => {
    expect(summarise([entry({ gameId: "pool" })], "snooker").size).toBe(0);
  });
});

describe("LocalProgressStore", () => {
  let data: Record<string, string>;
  beforeEach(() => {
    data = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => void (data[k] = v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves, persists, and returns a stable snapshot until the data changes", () => {
    const store = new LocalProgressStore("k");
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    store.save(entry());
    const b = store.getSnapshot();
    expect(b).not.toBe(a);
    expect(b).toHaveLength(1);
    expect(store.getSnapshot()).toBe(b);
    expect(JSON.parse(data.k)).toHaveLength(1);
  });

  it("loads what an earlier session saved and ignores malformed entries", () => {
    data.k = JSON.stringify([entry(), { nonsense: true }]);
    expect(new LocalProgressStore("k").getSnapshot()).toHaveLength(1);
  });

  it("survives corrupt storage", () => {
    data.k = "{not json";
    expect(new LocalProgressStore("k").getSnapshot()).toEqual([]);
  });

  it("notifies subscribers on save and stops after unsubscribe", () => {
    const store = new LocalProgressStore("k");
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.save(entry());
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    store.save(entry());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("keeps working in memory when storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const store = new LocalProgressStore("k");
    store.save(entry());
    expect(store.getSnapshot()).toHaveLength(1);
  });

  it("clear empties the store", () => {
    const store = new LocalProgressStore("k");
    store.save(entry());
    store.clear();
    expect(store.getSnapshot()).toHaveLength(0);
  });
});
