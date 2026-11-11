import { describe, expect, it } from "vitest";
import type { GameId } from "@/core/game";
import { scanCannon } from "@/core/lessons/cannon";
import { buildDemo } from "@/core/lessons/demo";
import { validateLesson } from "@/core/lessons/logic";
import { GAMES } from "./registry";

const entries = Object.entries(GAMES).map(([id, entry]) => ({ id: id as GameId, ...entry! }));
const watchLessons = entries.flatMap(({ id, game, lessons }) => lessons.filter((l) => l.kind === "watch").map((lesson) => ({ id, game, lesson })));

describe("lesson notes", () => {
  it.each(watchLessons.map((w) => [w.lesson.id, w] as const))("%s has written notes that validate", (_, { game, lesson }) => {
    expect(lesson.kind === "watch" && lesson.notes?.length).toBeGreaterThan(0);
    expect(validateLesson(game, game.createTable(), lesson)).toEqual([]);
  });

  const demos = watchLessons.flatMap(({ id, game, lesson }) =>
    lesson.kind === "watch" ? (lesson.notes ?? []).flatMap((s) => (s.demo?.shot ? [{ id, game, demo: s.demo, name: `${lesson.id}: ${s.heading}` }] : [])) : [],
  );

  // The animations are the real engine, so a physics change could quietly make a caption untrue.
  it.each(demos.map((d) => [d.name, d] as const))("%s plays as its caption says", (_, { game, demo }) => {
    const table = game.createTable();
    const built = buildDemo(game, table, demo);
    const result = game.simulate(table, built.bodies, built.shot!);
    const pots = result.events.flatMap((e) => (e.type === "pocket" ? [{ body: e.body, pocket: e.pocket }] : []));
    expect(pots.some((p) => p.body === game.input.strikerId)).toBe(!!demo.strikerPots);
    const aim = demo.shot!.aim;
    if ("pot" in aim) {
      const potted = pots.some((p) => p.body === aim.pot && p.pocket === aim.pocket);
      expect(potted).toBe(!demo.misses);
    }
    for (const id of demo.pots ?? []) expect(pots.map((p) => p.body)).toContain(id);
    if (demo.cannon !== undefined) {
      const scan = scanCannon(result, game.input.strikerId);
      expect(scan.made && scan.cushions >= demo.cannon).toBe(true);
    }
    expect(result.events.some((e) => e.type === "collision") || !("at" in aim || "pot" in aim)).toBe(true);
  });

  it("the stun demos stop the cue ball, and screw brings it back", () => {
    const snooker = GAMES.snooker!;
    const m4 = snooker.lessons.find((l) => l.id === "m4-watch");
    const section = (h: string) => (m4?.kind === "watch" ? m4.notes!.find((s) => s.heading.startsWith(h))!.demo! : null)!;
    const run = (h: string) => {
      const table = snooker.game.createTable();
      const built = buildDemo(snooker.game, table, section(h));
      const result = snooker.game.simulate(table, built.bodies, built.shot!);
      const start = built.bodies.find((b) => b.id === "white")!.position.x;
      const end = (result.keyframes.at(-1) ?? result.initial).find((b) => b.id === "white")!.position.x;
      // The white travels toward -x; contact happens one ball width short of the red.
      return { start, end, contact: 0.55 + 2 * 0.02625 };
    };
    const stun = run("Stun");
    expect(Math.abs(stun.end - stun.contact)).toBeLessThan(0.03);
    const screw = run("Screw");
    expect(screw.end - screw.contact).toBeGreaterThan(0.15);
    const top = run("Top");
    expect(top.contact - top.end).toBeGreaterThan(0.15);
  });
});
