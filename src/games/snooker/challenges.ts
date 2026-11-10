import { makeChallenges } from "@/core/lessons/challenges";
import { SNOOKER, createSnookerTable } from "./table";

const table = createSnookerTable();

export const snookerChallenges = makeChallenges({
  gameId: "snooker",
  table,
  radius: SNOOKER.ballRadius,
  strikerId: "white",
  striker: (rng) => ({ x: table.width * (0.25 + rng() * 0.5), y: 0.45 + rng() * 0.5 }),
  targets: ["black", "pink", "blue"],
  blockers: Array.from({ length: 9 }, (_, i) => `red${i + 1}`),
  name: (id) => id,
});
