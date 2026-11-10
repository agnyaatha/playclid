import { describe, expect, it } from "vitest";
import { createSnookerTable } from "@/games/snooker/table";
import { povPose, poseDistance, poseFor, lerpPose, topHeight, topPose } from "./camera";
import { aimDirection, fromThree, toThree } from "./coords";

const table = createSnookerTable();

describe("coordinate mapping", () => {
  it("round-trips and maps length to X, height to Y, width to Z", () => {
    const p = { x: 0.4, y: 2.2, z: 0.03 };
    expect(toThree(p)).toEqual([2.2, 0.03, 0.4]);
    expect(fromThree(...toThree(p))).toEqual(p);
  });

  it("aims along +X for a shot up the table (physics aim of 90 degrees)", () => {
    const [dx, dz] = aimDirection(Math.PI / 2);
    expect(dx).toBeCloseTo(1, 9);
    expect(dz).toBeCloseTo(0, 9);
  });

  it("keeps handedness: the player's right (+x physics) is +Z when looking along +X", () => {
    const forward = [1, 0, 0];
    const up = [0, 1, 0];
    const right = [forward[1] * up[2] - forward[2] * up[1], forward[2] * up[0] - forward[0] * up[2], forward[0] * up[1] - forward[1] * up[0]];
    expect(right).toEqual([0, 0, 1]);
    expect(toThree({ x: 1, y: 0, z: 0 })).toEqual([0, 0, 1]);
  });
});

describe("camera poses", () => {
  it("puts the point-of-view camera behind the striker, on the aim line, looking ahead", () => {
    const striker = { x: 0.9, y: 0.6 };
    const aim = Math.PI / 2;
    const pose = povPose(striker, aim);
    // Behind (smaller X than the cue ball at X = 0.6) and level with it across the table.
    expect(pose.position[0]).toBeLessThan(0.6);
    expect(pose.position[2]).toBeCloseTo(0.9, 9);
    expect(pose.target[0]).toBeGreaterThan(0.6);
    expect(pose.position[1]).toBeGreaterThan(0.1);
  });

  it("follows the aim: aiming to the right of the table swings the camera round with it", () => {
    const a = povPose({ x: 0.9, y: 0.6 }, Math.PI / 2);
    const b = povPose({ x: 0.9, y: 0.6 }, Math.PI / 2 - 0.3);
    expect(b.position[2]).not.toBeCloseTo(a.position[2], 3);
  });

  it("sees the whole table from above at any aspect ratio", () => {
    for (const aspect of [0.6, 1, 1.9, 2.5]) {
      const h = topHeight(aspect, table);
      const half = Math.tan((40 * Math.PI) / 360) * h;
      expect(half).toBeGreaterThanOrEqual(table.width / 2);
      expect(half * aspect).toBeGreaterThanOrEqual(table.length / 2);
    }
  });

  it("centres the overhead camera over the table with baulk on the left of the screen", () => {
    const pose = topPose(1.9, table);
    expect(pose.position[0]).toBeCloseTo(table.length / 2, 9);
    expect(pose.position[2]).toBeCloseTo(table.width / 2, 9);
    expect(pose.up).toEqual([0, 0, -1]);
  });

  it("auto mode aims from behind the ball, then goes overhead while balls move", () => {
    const striker = { x: 0.9, y: 0.6 };
    expect(poseFor("auto", false, 1.9, table, striker, Math.PI / 2).position[1]).toBeLessThan(1);
    expect(poseFor("auto", true, 1.9, table, striker, Math.PI / 2).position[1]).toBeGreaterThan(1);
    expect(poseFor("pov", true, 1.9, table, striker, Math.PI / 2).position[1]).toBeLessThan(1);
    expect(poseFor("top", false, 1.9, table, striker, Math.PI / 2).position[1]).toBeGreaterThan(1);
  });

  it("falls back to overhead when there is no striker to follow", () => {
    expect(poseFor("pov", false, 1.9, table, null, 0).position[1]).toBeGreaterThan(1);
  });

  it("interpolates between poses and measures their distance", () => {
    const a = povPose({ x: 0.9, y: 0.6 }, Math.PI / 2);
    const b = topPose(1.9, table);
    expect(poseDistance(a, lerpPose(a, b, 0))).toBe(0);
    expect(poseDistance(lerpPose(a, b, 1), b)).toBeCloseTo(0, 9);
    expect(poseDistance(a, lerpPose(a, b, 0.5))).toBeLessThan(poseDistance(a, b));
  });
});
