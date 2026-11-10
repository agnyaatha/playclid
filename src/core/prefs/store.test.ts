import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrefsStore } from "./store";

describe("PrefsStore", () => {
  let data: Record<string, string>;
  beforeEach(() => {
    data = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => void (data[k] = v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns the fallback for an unset preference and the value once set", () => {
    const s = new PrefsStore("p");
    expect(s.get("view", "2d")).toBe("2d");
    s.set("view", "3d");
    expect(s.get("view", "2d")).toBe("3d");
  });

  it("persists across instances", () => {
    new PrefsStore("p").set("skill", "expert");
    expect(new PrefsStore("p").get("skill", "club")).toBe("expert");
  });

  it("keeps a stable snapshot string until something changes", () => {
    const s = new PrefsStore("p");
    const a = s.getSnapshot();
    expect(s.getSnapshot()).toBe(a);
    s.set("x", 1);
    expect(s.getSnapshot()).not.toBe(a);
    expect(JSON.parse(s.getSnapshot())).toEqual({ x: 1 });
  });

  it("notifies subscribers, and not after they unsubscribe", () => {
    const s = new PrefsStore("p");
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.set("a", 1);
    off();
    s.set("a", 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ignores corrupt or wrongly shaped storage", () => {
    data.p = "{broken";
    expect(new PrefsStore("p").get("a", "fallback")).toBe("fallback");
    data.p = "[1,2,3]";
    expect(new PrefsStore("p").get("a", "fallback")).toBe("fallback");
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
    const s = new PrefsStore("p");
    s.set("view", "3d");
    expect(s.get("view", "2d")).toBe("3d");
  });
});
