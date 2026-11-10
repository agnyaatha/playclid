import { cutLayout } from "@/core/lessons/geometry";
import type { AidName, DrillLesson, Lesson, WatchLesson } from "@/core/lessons/schema";
import { createPoolTable, POOL } from "../table";

const table = createPoolTable();
const MID = table.length / 2;

const watch: WatchLesson = {
  kind: "watch",
  id: "p0-watch",
  gameId: "pool",
  module: "0",
  moduleTitle: "Rules and cue-ball control",
  order: 0,
  title: "Watch: 8-ball rules and cue-ball control",
  goal: "Know how 8-ball is played, and how stun, follow and draw send the cue ball.",
  videos: [
    { title: "The Rules of 8 Ball Pool – EXPLAINED!", url: "https://www.youtube.com/watch?v=eDKt-kaOtGE", tags: ["P"] },
    { title: "HOW TO PLAY 8 BALL … The \"Official Rules\" of Pool", url: "https://www.youtube.com/watch?v=c-4URzvawhs", tags: ["P"] },
    { title: "CUE BALL CONTROL … Everything You Need to Know", url: "https://www.youtube.com/watch?v=fPQEBxbByD4", tags: ["B"] },
    {
      title: "How to Master Stop, Follow, and Draw Skills … THE MOST USEFUL DRILL IN POOL",
      url: "https://www.youtube.com/watch?v=xUA1lsGKEAc",
      tags: ["B"],
    },
  ],
  practice: "Rack a set of balls and play five straight pots with stun, five with follow and five with draw, noting how far the cue ball travels.",
};

const common: { kind: "drill"; gameId: "pool"; aids: AidName[]; practiceAttempts: number; testAttempts: number } = {
  kind: "drill",
  gameId: "pool",
  aids: ["aimLine", "ghostBall", "prediction"],
  practiceAttempts: 6,
  testAttempts: 4,
};

function pot(
  id: string,
  order: number,
  title: string,
  goal: string,
  ball: { x: number; y: number },
  pocket: string,
  cutDeg: number,
  distance: number,
  stars: [number, number, number],
  tips: string[],
  side: 1 | -1 = 1,
): DrillLesson {
  const { striker } = cutLayout(table, POOL.ballRadius, ball, pocket, cutDeg, distance, side);
  return {
    ...common,
    id,
    module: "1",
    moduleTitle: "Potting basics",
    order,
    title,
    goal,
    layout: [
      { id: "white", ...striker },
      { id: "ball1", x: ball.x, y: ball.y },
    ],
    success: { pot: { ball: "ball1", pockets: [pocket] } },
    stars,
    tips,
  };
}

const drills: DrillLesson[] = [
  pot("p1-straight-corner", 1, "Straight pot into the corner", "Pot the 1-ball into the corner pocket with the cue ball lined up behind it.", { x: 0.95, y: 2.0 }, "tr", 0, 0.6, [4, 6, 8], [
    "Line up the cue ball, the 1-ball and the middle of the pocket.",
    "A smooth, medium pace and a straight follow-through.",
  ]),
  pot("p1-side-pocket", 2, "Straight pot into the side pocket", "Pot the 1-ball straight into the side pocket.", { x: 0.9, y: MID }, "mr", 0, 0.5, [4, 6, 8], [
    "The side pocket is narrower to enter at an angle, so aim accurately.",
  ]),
  pot("p1-cut-30", 3, "Half-ball cut (30°)", "Pot the 1-ball with a half-ball cut into the side pocket.", { x: 1.0, y: MID }, "mr", 30, 0.5, [3, 5, 7], [
    "A half-ball hit sends the object ball about 30° off the line of the cue ball.",
  ], -1),
];

export const poolLessons: Lesson[] = [watch, ...drills];
