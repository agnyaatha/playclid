import { afterEach, describe, expect, it, vi } from "vitest";
import { sectionOf, track, validGaId } from "./track";

describe("analytics", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the game and section from a path", () => {
    expect(sectionOf("/")).toEqual({ game: "none", section: "home" });
    expect(sectionOf("/snooker")).toEqual({ game: "snooker", section: "overview" });
    expect(sectionOf("/pool/practice")).toEqual({ game: "pool", section: "practice" });
    expect(sectionOf("/carrom/lessons/aim-1?x=1")).toEqual({ game: "carrom", section: "lessons" });
  });

  it("accepts only a well-formed GA4 measurement ID, since it is written into a script", () => {
    expect(validGaId("G-AB12CD34EF")).toBe("G-AB12CD34EF");
    expect(validGaId(undefined)).toBeNull();
    expect(validGaId("UA-1234-1")).toBeNull();
    expect(validGaId("G-1');alert(1);//")).toBeNull();
  });

  it("does nothing until GA has been loaded with consent", () => {
    vi.stubGlobal("window", { location: { pathname: "/pool/practice" } });
    expect(() => track("shot", { potted: 1 })).not.toThrow();
  });

  it("tags each event with the game and section it happened in", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag, location: { pathname: "/snooker/challenges/c1" } });
    track("activity_complete", { kind: "drill", stars: 3 });
    expect(gtag).toHaveBeenCalledWith("event", "activity_complete", { game: "snooker", section: "challenges", kind: "drill", stars: 3 });
  });
});
