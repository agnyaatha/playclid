import { makeChallenges } from "@/core/lessons/challenges";
import { cutLayout } from "@/core/lessons/geometry";
import { layoutOf } from "@/core/lessons/demo";
import type { AidName, Lesson, WatchLesson } from "@/core/lessons/schema";
import { createPoolTable, POOL } from "@/games/pool/table";
import { nineball } from "./index";

const table = createPoolTable();
const MID = table.length / 2;
const common: { kind: "drill"; gameId: "nineball"; aids: AidName[]; practiceAttempts: number; testAttempts: number; module: string; moduleTitle: string } = {
  kind: "drill",
  gameId: "nineball",
  aids: ["aimLine", "ghostBall", "prediction"],
  practiceAttempts: 6,
  testAttempts: 4,
  module: "1",
  moduleTitle: "Rotation basics",
};

const white = (ball: { x: number; y: number }, pocket: string, cut: number, distance: number, side: 1 | -1 = 1) => cutLayout(table, POOL.ballRadius, ball, pocket, cut, distance, side);

const learn: WatchLesson = {
  kind: "watch",
  id: "n0-learn",
  gameId: "nineball",
  module: "0",
  moduleTitle: "How 9-ball works",
  order: 0,
  title: "Rotation: lowest ball first",
  goal: "Know the rack, the one rule that shapes every shot, and how the 9 wins.",
  videos: [],
  notes: [
    {
      heading: "The rack",
      body: [
        "9-ball uses the cue ball and the balls numbered 1 to 9, racked in a diamond. The 1 is at the front on the foot spot, the 9 is in the middle, and the others go anywhere. You break from behind the head string (the baulk line).",
      ],
      demo: { caption: "The diamond rack: the 1 at the front, the 9 in the middle.", layout: layoutOf(nineball.createInitialBodies(table)) },
    },
    {
      heading: "Hit the lowest ball first",
      body: [
        "On every shot, the cue ball must hit the lowest numbered ball on the table first. After that legal contact, any ball that drops counts, and you keep playing. You do not have to pot the lowest ball; you only have to hit it first.",
        "After contact, a ball must be potted or some ball (the cue ball included) must reach a cushion. Otherwise it is a foul.",
      ],
      demo: {
        caption: "The 1 is the lowest ball, so it must be hit first. Here it is potted, and the 2 is left alone.",
        layout: [
          { id: "white", ...white({ x: 0.95, y: 2.0 }, "tr", 0, 0.6).striker },
          { id: "ball1", x: 0.95, y: 2.0 },
          { id: "ball2", x: 0.3, y: 1.1 },
        ],
        shot: { aim: { pot: "ball1", pocket: "tr" }, power: 0.12, spin: { y: -0.3 } },
      },
    },
    {
      heading: "The 9 wins",
      body: [
        "Whoever legally pots the 9 wins the rack, whenever it happens. Usually that is at the end of a run through all nine balls, but a combination counts too: hit the lowest ball first and knock the 9 in with it, and you win on the spot, even on the break.",
      ],
      demo: {
        caption: "A combination: the cue ball hits the 1 first, as it must, and the 1 sends the 9 into the side pocket. That wins the rack.",
        layout: [
          { id: "white", x: 0.25, y: MID },
          { id: "ball1", x: 0.65, y: MID },
          { id: "ball9", x: 0.95, y: MID },
        ],
        shot: { aim: { at: "ball1" }, power: 0.12, spin: { y: -0.2 } },
        pots: ["ball9"],
      },
    },
    {
      heading: "Fouls and ball in hand",
      body: [
        "Any foul gives your opponent ball in hand anywhere on the table: hitting the wrong ball first, no ball to a cushion after contact, or potting the cue ball. With only nine balls, ball in hand often means losing the rack, so a safety that leaves your opponent no clear hit on the lowest ball is a strong shot. If the 9 goes down on a foul, it is spotted again.",
      ],
      points: [
        "Under World Pool-Billiard Association rules, three fouls in a row lose the rack, and the player after the break may choose to push out. This app does not use these two rules.",
        "Plan the run as a sequence: pot each ball while leaving the cue ball on the right side of the next one.",
      ],
    },
  ],
};

export const nineLessons: Lesson[] = [
  learn,
  {
    ...common,
    id: "n1-lowest-first",
    order: 1,
    title: "Lowest ball first",
    goal: "In 9-ball you must hit the lowest ball first. Pot the 1 and leave the 2 alone.",
    layout: [{ id: "white", ...white({ x: 0.95, y: 2.0 }, "tr", 0, 0.6).striker }, { id: "ball1", x: 0.95, y: 2.0 }, { id: "ball2", x: 0.3, y: 1.1 }],
    success: { pot: { ball: "ball1", pockets: ["tr"] } },
    stars: [4, 6, 8],
    tips: ["Check which ball is on before you look at anything else.", "Hitting any other ball first is a foul and gives away ball in hand."],
  },
  {
    ...common,
    id: "n1-money-ball",
    order: 2,
    title: "The money ball",
    goal: "The 9 wins the rack. Cut it into the corner under no pressure, so you are ready when it counts.",
    layout: [{ id: "white", ...white({ x: 0.95, y: 2.0 }, "tr", 20, 0.6).striker }, { id: "ball9", x: 0.95, y: 2.0 }],
    success: { pot: { ball: "ball9", pockets: ["tr"] } },
    stars: [3, 5, 7],
    tips: ["Same routine as every other shot. Nothing changes because it is the 9."],
  },
  {
    ...common,
    id: "n1-combination",
    order: 3,
    title: "The 1 into the 9",
    goal: "Hit the 1 so it knocks the 9 into the side pocket. A legal combination wins on the spot.",
    layout: [{ id: "white", x: 0.25, y: MID }, { id: "ball1", x: 0.65, y: MID }, { id: "ball9", x: 0.95, y: MID }],
    success: { pot: { ball: "ball9", pockets: ["mr"] } },
    stars: [3, 5, 7],
    tips: ["Line up all three balls with the pocket.", "Errors grow with every ball in the chain, so keep the balls close."],
  },
  {
    ...common,
    id: "n1-next-ball",
    order: 4,
    title: "Play for the next ball",
    goal: "Pot the 1 and stop the cue ball in the target circle, ready for the 2.",
    layout: [{ id: "white", ...white({ x: 0.9, y: MID }, "mr", 0, 0.35).striker }, { id: "ball1", x: 0.9, y: MID }],
    success: { pot: { ball: "ball1", pockets: ["mr"] }, zone: { x: 0.9 - 2 * POOL.ballRadius, y: MID, radius: 0.14 } },
    stars: [3, 5, 7],
    tips: ["Winning at rotation is about where the cue ball goes next, not just the pot."],
  },
];

export const nineChallenges = makeChallenges({
  gameId: "nineball",
  table,
  radius: POOL.ballRadius,
  strikerId: "white",
  striker: (rng) => ({ x: table.width * (0.25 + rng() * 0.5), y: 0.35 + rng() * 0.4 }),
  targets: ["ball1", "ball2", "ball9"],
  blockers: [3, 4, 5, 6, 7, 8, 10, 11, 12].map((n) => `ball${n}`),
  name: (id) => `${id.slice(4)}-ball`,
  seedOffset: 5000,
});
