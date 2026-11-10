import type { BreakLesson, LayoutBall } from "@/core/lessons/schema";

const COLOURS: LayoutBall[] = ["yellow", "green", "brown", "blue", "pink", "black"].map((c) => ({ id: c, spot: c }));
const whiteInD: LayoutBall = { id: "white", x: 0.8, y: 0.55 };

export const breakLessons: BreakLesson[] = [
  {
    kind: "break",
    id: "m5-clearance",
    gameId: "snooker",
    module: "5",
    moduleTitle: "Positional play and break-building",
    order: 1,
    title: "Colour clearance: yellow to black",
    goal: "Clear the colours in order, from yellow to black, in one visit. A full clearance is 27 points.",
    layout: [whiteInD, ...COLOURS],
    redsLeft: 0,
    stars: [9, 20, 27],
    tips: [
      "Think one ball ahead: send the white towards where the next colour is easiest to pot.",
      "A gentle stun or follow often leaves a better angle than a hard shot.",
    ],
  },
  {
    kind: "break",
    id: "m5-red-black",
    gameId: "snooker",
    module: "5",
    moduleTitle: "Positional play and break-building",
    order: 2,
    title: "Red, black, red, black",
    goal: "Pot a red, then the black, and keep going. Five reds are left near the black spot.",
    layout: [
      { id: "white", x: 0.6, y: 1.9 },
      ...COLOURS,
      { id: "red1", x: 0.5, y: 2.75 },
      { id: "red2", x: 0.72, y: 2.52 },
      { id: "red3", x: 1.1, y: 2.55 },
      { id: "red4", x: 1.3, y: 2.78 },
      { id: "red5", x: 0.9, y: 2.3 },
    ],
    redsLeft: 5,
    stars: [8, 16, 24],
    tips: ["Pick the next red before you pot the black, so you know where the white has to go."],
  },
];
