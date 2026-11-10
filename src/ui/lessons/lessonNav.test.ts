import { describe, expect, it } from "vitest";
import { snookerLessons } from "@/games/snooker/lessons";
import { groupByModule, lessonHref, nextLesson } from "./lessonNav";

describe("lesson navigation", () => {
  it("builds lesson links", () => {
    expect(lessonHref("snooker", "m3-half-ball")).toBe("/snooker/lessons/m3-half-ball");
  });

  it("finds the next lesson in order and returns null at the end", () => {
    expect(nextLesson(snookerLessons, snookerLessons[0].id)).toBe(snookerLessons[1]);
    expect(nextLesson(snookerLessons, snookerLessons[snookerLessons.length - 1].id)).toBeNull();
    expect(nextLesson(snookerLessons, "nope")).toBeNull();
  });

  it("walks from a module's watch lesson into its drills", () => {
    expect(nextLesson(snookerLessons, "m3-watch")?.id).toBe("m3-straight-short");
  });

  it("groups lessons by module in curriculum order without losing any", () => {
    const groups = groupByModule(snookerLessons);
    expect(groups.map((g) => g.module)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    expect(groups.reduce((n, g) => n + g.lessons.length, 0)).toBe(snookerLessons.length);
    expect(groups.find((g) => g.module === "3")!.lessons[0].kind).toBe("watch");
  });
});
