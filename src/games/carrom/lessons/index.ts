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
];

export const carromLessons: Lesson[] = drills;
