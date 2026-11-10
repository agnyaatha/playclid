import { makeChallenges } from "@/core/lessons/challenges";
import { POOL, createPoolTable } from "./table";

const table = createPoolTable();

export const poolChallenges = makeChallenges({
  gameId: "pool",
  table,
  radius: POOL.ballRadius,
  strikerId: "white",
  striker: (rng) => ({ x: table.width * (0.25 + rng() * 0.5), y: 0.35 + rng() * 0.4 }),
  targets: ["ball1", "ball2", "ball3"],
  blockers: [9, 10, 11, 12, 13, 14, 15, 4, 5].map((n) => `ball${n}`),
  name: (id) => `${id.slice(4)}-ball`,
});
