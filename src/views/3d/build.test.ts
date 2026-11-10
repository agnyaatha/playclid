import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createCarromTable } from "@/games/carrom/table";
import { carromTheme } from "@/games/carrom/theme";
import { snookerTheme } from "@/games/snooker/theme";
import { createSnookerTable } from "@/games/snooker/table";
import { BallFactory, buildTable, cushionHeight } from "./build";

const table = createSnookerTable();
const group = buildTable(table, snookerTheme);
const named = (name: string) => group.children.filter((o) => o.name === name) as THREE.Mesh[];

describe("3D table geometry", () => {
  it("has the expected parts", () => {
    expect(named("cloth")).toHaveLength(1);
    expect(named("rail")).toHaveLength(4);
    expect(named("pocket")).toHaveLength(6);
    expect(named("cushion")).toHaveLength(6);
  });

  it("covers the playing area with the cloth, lying flat at height zero", () => {
    const box = new THREE.Box3().setFromObject(named("cloth")[0]);
    expect(box.min.x).toBeCloseTo(0, 6);
    expect(box.max.x).toBeCloseTo(table.length, 6);
    expect(box.min.z).toBeCloseTo(0, 6);
    expect(box.max.z).toBeCloseTo(table.width, 6);
    expect(box.max.y).toBeCloseTo(0, 6);
  });

  it("keeps every cushion off the cloth, with its nose on the physics cushion line", () => {
    for (const m of named("cushion")) {
      const b = new THREE.Box3().setFromObject(m);
      const onLongSide = b.max.z - b.min.z < 0.1;
      if (onLongSide) {
        const nose = b.max.z <= 0.06 ? b.max.z : b.min.z;
        expect(Math.min(Math.abs(nose), Math.abs(nose - table.width))).toBeLessThan(1e-6);
      } else {
        const nose = b.max.x <= 0.06 ? b.max.x : b.min.x;
        expect(Math.min(Math.abs(nose), Math.abs(nose - table.length))).toBeLessThan(1e-6);
      }
      expect(b.max.y).toBeCloseTo(cushionHeight(snookerTheme), 6);
    }
  });

  it("matches each cushion's length to its physics segment, so cushions stop at the pocket jaws", () => {
    const expected = table.cushions.map((c) => Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y)).sort((a, b) => a - b);
    const built = named("cushion")
      .map((m) => {
        const b = new THREE.Box3().setFromObject(m);
        return Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      })
      .sort((a, b) => a - b);
    built.forEach((len, i) => expect(len).toBeCloseTo(expected[i], 6));
  });

  it("builds a carrom board with four pockets and four cushions", () => {
    const board = buildTable(createCarromTable(), carromTheme);
    expect(board.children.filter((o) => o.name === "pocket")).toHaveLength(4);
    expect(board.children.filter((o) => o.name === "cushion")).toHaveLength(4);
  });
});

describe("balls", () => {
  it("makes spheres for ball games and shares one geometry between balls of the same size", () => {
    const f = new BallFactory(snookerTheme);
    const a = f.create("red1", 0.02625);
    const b = f.create("red2", 0.02625);
    expect((a.mesh.geometry as THREE.SphereGeometry).parameters.radius).toBeCloseTo(0.02625, 9);
    expect(a.mesh.geometry).toBe(b.mesh.geometry);
    expect(a.height).toBeCloseTo(0.0525, 9);
    f.dispose();
  });

  it("makes flat discs for carrom", () => {
    const f = new BallFactory(carromTheme);
    const coin = f.create("w1", 0.01575);
    expect(coin.mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
    expect(coin.height).toBeLessThan(0.01);
    f.dispose();
  });
});
