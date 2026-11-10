import { makeChallenges } from "@/core/lessons/challenges";
import { QUEEN, STRIKER } from "./layout";
import { CARROM, createCarromTable } from "./table";

const table = createCarromTable();

export const carromChallenges = makeChallenges({
  gameId: "carrom",
  table,
  radius: CARROM.coinRadius,
  strikerId: STRIKER,
  striker: () => ({ x: table.width / 2, y: CARROM.baselineY }),
  targets: [QUEEN, "w1", "w2"],
  blockers: Array.from({ length: 9 }, (_, i) => `b${i + 1}`),
  name: (id) => (id === QUEEN ? "queen" : "white coin"),
  // The striker slides along its baseline, so coins are kept off it.
  keepOut: (p) => p.y < CARROM.baselineY + 3 * CARROM.strikerRadius,
});
