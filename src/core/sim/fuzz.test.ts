import { describe, expect, it } from "vitest";
import { carrom } from "@/games/carrom";
import { pool } from "@/games/pool";
import { snooker } from "@/games/snooker";
import { makeRng } from "../ai/rng";
import type { Game } from "../game";
import type { Body } from "../types";

const energy = (bodies: Body[]) =>
  bodies.reduce((e, b) => {
    if (b.state === "pocketed") return e;
    const I = 0.4 * b.mass * b.radius * b.radius;
    return (
      e +
      0.5 * b.mass * (b.velocity.x ** 2 + b.velocity.y ** 2) +
      0.5 * I * (b.angularVelocity.x ** 2 + b.angularVelocity.y ** 2 + b.angularVelocity.z ** 2)
    );
  }, 0);

/** Random shots from evolving positions; the table state carries on from shot to shot as in a real frame. */
function fuzz(game: Game, shots: number, seed: number) {
  const table = game.createTable();
  const r = makeRng(seed);
  let bodies = game.createInitialBodies(table);
  const problems: string[] = [];
  let maxEvents = 0;
  for (let i = 0; i < shots; i++) {
    if (i % 25 === 0) bodies = game.createInitialBodies(table);
    const tip = game.input.tipOffset ? 0.6 : 0;
    const controls = { aim: r() * Math.PI * 2, power: 0.05 + r() * 0.95, spinX: (r() - 0.5) * tip, spinY: (r() - 0.5) * tip };
    const res = game.simulate(table, bodies, game.input.buildShot(controls));
    maxEvents = Math.max(maxEvents, res.events.length);

    let e = energy(res.initial);
    res.keyframes.forEach((frame, k) => {
      const now = energy(frame);
      if (now > e * (1 + 1e-6) + 1e-7) problems.push(`shot ${i}: energy rose at event ${k} (${res.events[k].type}) ${e} -> ${now}`);
      e = now;
    });
    const live = res.final.filter((b) => b.state !== "pocketed");
    for (const b of live) {
      if (!Number.isFinite(b.position.x + b.position.y)) problems.push(`shot ${i}: ${b.id} is not finite`);
      if (b.state !== "stationary") problems.push(`shot ${i}: ${b.id} is still ${b.state}`);
      if (b.position.x < 0 || b.position.x > table.width) problems.push(`shot ${i}: ${b.id} off the table in x`);
      if (b.position.y < 0 || b.position.y > table.length) problems.push(`shot ${i}: ${b.id} off the table in y`);
    }
    for (let a = 0; a < live.length; a++) {
      for (let b = a + 1; b < live.length; b++) {
        const gap = Math.hypot(live[a].position.x - live[b].position.x, live[a].position.y - live[b].position.y) - live[a].radius - live[b].radius;
        if (gap < -1e-6) problems.push(`shot ${i}: ${live[a].id} overlaps ${live[b].id} by ${(-gap).toExponential(1)}`);
      }
    }
    bodies = (game.afterShot?.(res, table).bodies ?? res.final).map((b) => ({ ...b }));
  }
  return { problems, maxEvents };
}

describe.each([
  ["snooker", snooker],
  ["pool", pool],
  ["carrom", carrom],
] as const)("%s physics invariants over random play", (_name, game) => {
  it("never loses a ball, overlaps, gains energy, or fails to come to rest", () => {
    const { problems, maxEvents } = fuzz(game, 400, 2026);
    expect(problems.slice(0, 8)).toEqual([]);
    expect(maxEvents).toBeLessThan(5000);
  }, 120_000);
});
