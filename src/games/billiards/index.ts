import type { Game } from "@/core/game";
import { cutLayout } from "@/core/lessons/geometry";
import type { AidName, Lesson } from "@/core/lessons/schema";
import { snooker } from "@/games/snooker";
import { colourSpots, makeBall, whiteInD } from "@/games/snooker/layout";
import { createSnookerTable, SNOOKER } from "@/games/snooker/table";
import { billiardsRules } from "./rules";

/** English billiards shares the snooker table and physics; it has three balls and its own scoring. */
export const billiards: Game = {
  ...snooker,
  id: "billiards",
  name: "English Billiards",
  rules: billiardsRules,
  createInitialBodies: (table) => {
    const s = colourSpots(table);
    return [whiteInD(table), makeBall("yellow", s.blue.x, s.blue.y), makeBall("red", s.black.x, s.black.y)];
  },
};

const table = createSnookerTable();
const MID = table.length / 2;
const common: { kind: "drill"; gameId: "billiards"; aids: AidName[]; practiceAttempts: number; testAttempts: number; module: string; moduleTitle: string } = {
  kind: "drill",
  gameId: "billiards",
  aids: ["aimLine", "ghostBall", "prediction"],
  practiceAttempts: 6,
  testAttempts: 4,
  module: "1",
  moduleTitle: "The three ways to score",
};

const red = { x: 1.25, y: MID };

export const billiardsLessons: Lesson[] = [
  {
    ...common,
    id: "b1-winning-hazard",
    order: 1,
    title: "Winning hazard",
    goal: "Pot the red into the middle pocket for 3 points.",
    layout: [{ id: "white", ...cutLayout(table, SNOOKER.ballRadius, red, "mr", 15, 0.5, 1).striker }, { id: "red", ...red }],
    success: { pot: { ball: "red", pockets: ["mr"] } },
    stars: [4, 6, 8],
    tips: ["Potting the red earns 3, and it goes back on its spot so the break can continue."],
  },
  {
    ...common,
    id: "b1-cannon",
    order: 2,
    title: "The cannon",
    goal: "Make your ball hit both other balls, for 2 points.",
    layout: [{ id: "white", x: 0.89, y: 1.4 }, { id: "red", x: 0.75, y: 2.2 }, { id: "yellow", x: 1.05, y: 2.2 }],
    success: { cannon: { cushions: 0 } },
    stars: [4, 6, 8],
    tips: ["Hit the first ball thinly enough that your ball carries on to the second."],
  },
  {
    ...common,
    id: "b1-in-off",
    order: 3,
    title: "In-off the red",
    goal: "Hit the red so your own ball runs into the pocket: a losing hazard, worth 3.",
    layout: [{ id: "white", x: 0.9, y: 2.6 }, { id: "red", x: 1.3, y: 3.05 }],
    success: { inOff: true },
    stars: [3, 5, 7],
    tips: ["Unlike snooker, going in-off is a scoring shot here.", "A thick contact sends your ball off at a predictable angle."],
  },
];
