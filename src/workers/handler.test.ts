import { describe, expect, it } from "vitest";
import { SKILLS } from "@/core/ai/advisor";
import { snooker } from "@/games/snooker";
import { handleAdvisorRequest } from "./handler";

describe("advisor handler", () => {
  const table = snooker.createTable();
  const mid = table.length / 2;

  it("answers a suggest request with a suggestion, echoing the request id", () => {
    const bodies = [snooker.createBody("white", 0.85, mid), snooker.createBody("red1", 1.25, mid)];
    const res = handleAdvisorRequest({
      id: 42,
      kind: "suggest",
      gameId: "snooker",
      request: { bodies, targets: [{ id: "red1", value: 1 }], skill: SKILLS.club, seed: 1 },
    });
    expect(res).toMatchObject({ id: 42, kind: "suggest" });
    if (res.kind === "suggest") expect(res.suggestion).toMatchObject({ kind: "pot", target: "red1" });
  });

  it("solves a drill and returns controls that pass it", () => {
    const res = handleAdvisorRequest({ id: 1, kind: "solve", gameId: "snooker", lessonId: "m3-straight-short" });
    expect(res.kind).toBe("solve");
    if (res.kind === "solve") expect(res.controls).not.toBeNull();
  });

  it("finds a pot from a live position, skipping potted balls", () => {
    const bodies = [snooker.createBody("white", 0.85, mid), snooker.createBody("red1", 1.25, mid), { ...snooker.createBody("blue", 1, 1), state: "pocketed" as const }];
    const res = handleAdvisorRequest({ id: 5, kind: "findPot", gameId: "snooker", bodies, targets: ["blue", "red1"] });
    expect(res.kind).toBe("findPot");
    if (res.kind === "findPot") expect(res.pot?.ball).toBe("red1");
  });

  it("returns null for a lesson that is not a drill, and an error for an unknown game", () => {
    const watch = handleAdvisorRequest({ id: 2, kind: "solve", gameId: "snooker", lessonId: "m0-watch" });
    expect(watch).toMatchObject({ kind: "solve", controls: null });
    const bad = handleAdvisorRequest({ id: 3, kind: "solve", gameId: "nonexistent" as never, lessonId: "x" });
    expect(bad.kind).toBe("error");
  });
});
