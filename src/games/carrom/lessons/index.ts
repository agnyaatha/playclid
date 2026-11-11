import { layoutOf } from "@/core/lessons/demo";
import type { AidName, DrillLesson, Lesson, WatchLesson } from "@/core/lessons/schema";
import { startingBodies } from "../layout";
import { CARROM, createCarromTable } from "../table";

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

const learn: WatchLesson = {
  kind: "watch",
  id: "c0-learn",
  gameId: "carrom",
  module: "0",
  moduleTitle: "How carrom works",
  order: 0,
  title: "The board, the coins and the flick",
  goal: "Know the coins, how to flick the striker, and how the queen is won.",
  videos: [],
  notes: [
    {
      heading: "The board and the coins",
      body: [
        "Carrom is played on a smooth square board, about 74 cm across inside the frame, with a pocket in each corner. A light dusting of powder lets the pieces glide. There are nine white coins, nine black coins and one red coin, the queen. You play them with a heavier, larger disc: the striker.",
        "At the start, the queen sits in the centre, with six coins in a ring around her and twelve more in an outer ring, the colours alternating.",
      ],
      demo: { caption: "The opening pattern: the queen in the centre, the coins in two rings around her, and the striker on the baseline.", layout: layoutOf(startingBodies(createCarromTable())) },
    },
    {
      heading: "The flick",
      body: [
        "You shoot by flicking the striker with a finger, from anywhere along your baseline. Most players flick with the index finger, steadying the hand with the other fingers or the thumb on the board. Others push with the middle finger or flick with the thumb. Keep your hand still and move only the finger, straight through the line of aim, just as you would keep the cue straight in snooker.",
        "Choosing where to put the striker on the baseline is half of the aim. Slide it along until the coin and the pocket line up with a comfortable angle.",
      ],
    },
    {
      heading: "Aiming at a coin",
      body: [
        "Aiming works as it does in pool. Picture the striker touching the coin on the far side from the pocket (the ghost striker) and flick it to that spot. The coin then goes toward the pocket. A firm flick is more reliable than a gentle one, because a slow coin can stop in the jaws.",
      ],
      demo: {
        caption: "A cut into the far right corner: the striker meets the coin at the ghost position and the white coin drops in.",
        layout: [
          { id: "striker", x: 0.37, y: CARROM.baselineY },
          { id: "w1", x: 0.45, y: 0.45 },
        ],
        shot: { aim: { deg: 81.22 }, power: 0.3 },
        pots: ["w1"],
      },
    },
    {
      heading: "Scoring and the queen",
      body: [
        "Each player has a colour; here Player 1 plays white. Pocket one of your coins and you shoot again. Pocket none of yours and the turn passes. The first to clear all nine of their coins wins.",
        "The queen is worth 3, but you must cover her: after pocketing the queen, you must pocket one of your own coins on the same shot or the next. Miss the cover, and the queen goes back to the centre.",
      ],
      demo: {
        caption: "Taking the queen from the centre into the far left corner. Now she needs covering with one of your own coins.",
        layout: [
          { id: "striker", x: 0.37, y: CARROM.baselineY },
          { id: "queen", x: 0.37, y: 0.37 },
        ],
        shot: { aim: { deg: 95.66 }, power: 0.4 },
        pots: ["queen"],
      },
    },
    {
      heading: "Fouls",
      body: [
        "Pocketing the striker is a foul. Any coins pocketed on that shot come back to the board, and if none of yours went in, you also give back one coin you pocketed earlier. The striker returns to the baseline after every shot.",
      ],
    },
  ],
};

export const carromLessons: Lesson[] = [learn, ...drills];
