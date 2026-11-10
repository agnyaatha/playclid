import type { AidName, DrillLesson, Lesson } from "@/core/lessons/schema";
import { CARROM } from "../table";

const common: { kind: "drill"; gameId: "carrom"; aids: AidName[]; practiceAttempts: number; testAttempts: number } = {
  kind: "drill",
  gameId: "carrom",
  aids: ["aimLine", "ghostBall", "prediction"],
  practiceAttempts: 6,
  testAttempts: 4,
};

const striker = { id: "striker", x: 0.37, y: CARROM.baselineY };

const drills: DrillLesson[] = [
  {
    ...common,
    id: "c1-corner-cut",
    module: "1",
    moduleTitle: "Pocketing coins",
    order: 1,
    title: "Cut a coin into the corner",
    goal: "Flick the striker so the white coin drops into the top-right pocket.",
    layout: [striker, { id: "w1", x: 0.45, y: 0.45 }],
    success: { pot: { ball: "w1", pockets: ["tr"] } },
    stars: [3, 5, 7],
    tips: [
      "Aim at the ghost coin: where the striker must be when it touches the coin.",
      "A firm flick pots more reliably than a gentle one, because a slow coin can stop short of the pocket.",
    ],
  },
  {
    ...common,
    id: "c1-wide-cut",
    module: "1",
    moduleTitle: "Pocketing coins",
    order: 2,
    title: "A wider angle",
    goal: "Pot the coin from a different angle: a thinner contact this time.",
    layout: [striker, { id: "w1", x: 0.6, y: 0.35 }],
    success: { pot: { ball: "w1", pockets: ["tr"] } },
    stars: [3, 5, 7],
    tips: ["Slide the striker along the baseline to change the angle, then adjust the aim."],
  },
  {
    ...common,
    id: "c1-straight-line",
    module: "1",
    moduleTitle: "Pocketing coins",
    order: 3,
    title: "Straight down the line",
    goal: "The coin sits on a straight line from the striker to the pocket. Send it in with a full hit.",
    layout: [striker, { id: "w1", x: 0.592, y: 0.474 }],
    success: { pot: { ball: "w1", pockets: ["tr"] } },
    stars: [4, 6, 8],
    tips: ["A full, straight hit is the easiest shot to learn your aim on."],
  },
  {
    ...common,
    id: "c1-left-corner",
    module: "1",
    moduleTitle: "Pocketing coins",
    order: 4,
    title: "Across to the other corner",
    goal: "Now pocket a coin in the top-left corner, so you can play to both sides.",
    layout: [striker, { id: "w1", x: 0.26, y: 0.46 }],
    success: { pot: { ball: "w1", pockets: ["tl"] } },
    stars: [3, 5, 7],
    tips: ["Most players have a stronger side: spend time on the other one."],
  },
  {
    ...common,
    id: "c2-queen",
    module: "2",
    moduleTitle: "The queen and traffic",
    order: 1,
    title: "Take the queen",
    goal: "Pocket the queen from the centre of the board, the most valuable coin in the game.",
    layout: [striker, { id: "queen", x: 0.37, y: 0.37 }],
    success: { pot: { ball: "queen", pockets: ["tr", "tl"] } },
    stars: [3, 5, 7],
    tips: ["She needs a clean cut from the middle, and you can choose either top corner."],
  },
  {
    ...common,
    id: "c2-through-gap",
    module: "2",
    moduleTitle: "The queen and traffic",
    order: 2,
    title: "Through the gap",
    goal: "Two black coins guard the way. Get the striker between them and pocket the white.",
    layout: [striker, { id: "w1", x: 0.5, y: 0.5 }, { id: "b1", x: 0.36, y: 0.3 }, { id: "b2", x: 0.5, y: 0.3 }],
    success: { pot: { ball: "w1", pockets: ["tr"] } },
    stars: [3, 5, 7],
    tips: ["Check the striker's whole width clears the coins, not just its centre line."],
  },
];

export const carromLessons: Lesson[] = drills;
