import { cutLayout } from "@/core/lessons/geometry";
import type { AidName, DrillLesson, LayoutBall, Lesson, NoteSection, WatchLesson } from "@/core/lessons/schema";
import { createPoolTable, POOL } from "../table";

const table = createPoolTable();
const MID = table.length / 2;

/** A straight pot into the side pocket, the cue ball 0.35 m back, used for stun, follow and draw. */
const STRAIGHT_SIDE: LayoutBall[] = [
  { id: "white", x: 0.35, y: MID },
  { id: "ball1", x: 0.75, y: MID },
];

const notes: NoteSection[] = [
  {
    heading: "8-ball in brief",
    body: [
      "8-ball is played with the cue ball and 15 object balls: the solids 1 to 7, the stripes 9 to 15, and the black 8-ball. One player takes the solids and the other the stripes. You win by potting all of your group and then the 8-ball.",
      "The balls are racked in a triangle with the 8-ball in the middle and the apex ball on the foot spot. The breaker plays from behind the head string (the baulk line) and must pot a ball or drive at least four balls to a cushion.",
    ],
    points: [
      "After the break the table is open. The first ball you legally pot, a solid or a stripe, decides your group.",
      "Your turn continues while you keep legally potting balls of your group.",
      "Under the World Pool-Billiard Association rules most players use, you must call the ball and pocket on every shot except the break. Obvious shots need no calling. In bar rules you often call only the 8-ball.",
      "Pot the 8-ball before your group is cleared, or in a pocket you did not call, and you lose the frame. You also lose if you pot the cue ball on the shot that pots the 8.",
    ],
  },
  {
    heading: "Fouls and ball in hand",
    body: [
      "A foul gives your opponent ball in hand: they may place the cue ball anywhere on the table before playing. That is a big advantage, so avoiding fouls matters more in pool than in snooker.",
    ],
    points: [
      "Potting the cue ball (a scratch).",
      "Hitting a ball of the other group (or the 8-ball, too early) first.",
      "After the cue ball hits a legal ball, no ball goes to a cushion and nothing is potted.",
      "Touching a ball with your hand, clothing or the cue, other than the cue tip striking the cue ball.",
    ],
  },
  {
    heading: "Stop: stun the cue ball dead",
    body: [
      "Hit a little below centre so the cue ball still slides with no spin when it reaches the object ball. On a straight shot it stops on the spot where it made contact. This stop shot is the base of all cue-ball control.",
    ],
    demo: {
      caption: "Stop shot: struck a little below centre, the cue ball stops where the 1-ball was.",
      layout: STRAIGHT_SIDE,
      shot: { aim: { pot: "ball1", pocket: "mr" }, power: 0.17, spin: { y: -0.3 } },
    },
  },
  {
    heading: "Follow and draw",
    body: [
      "Hit above centre for follow: the cue ball rolls on after the object ball. Hit well below centre for draw: the backspin is still there at contact, and the cue ball comes back toward you. Use a level cue, a relaxed grip and a smooth follow-through. Draw comes from a clean low hit and cue speed, not a hard jab.",
      "On a cut, a stunned cue ball leaves the object ball at 90° to the object ball's path. Follow bends it forward of that line, and draw bends it back.",
    ],
    demo: {
      caption: "Draw: struck low, the cue ball comes back about 40 cm after potting the 1-ball.",
      layout: STRAIGHT_SIDE,
      shot: { aim: { pot: "ball1", pocket: "mr" }, power: 0.22, spin: { y: -0.5 } },
    },
  },
  {
    heading: "Follow in action",
    body: [
      "Follow at soft pace is the safest way to move the cue ball forward. Too hard, and on a straight shot it follows the object ball into the pocket for a scratch.",
    ],
    demo: {
      caption: "Follow: struck above centre, the cue ball rolls on after the 1-ball and stops short of the pocket.",
      layout: STRAIGHT_SIDE,
      shot: { aim: { pot: "ball1", pocket: "mr" }, power: 0.12, spin: { y: 0.4 } },
    },
  },
];

const watch: WatchLesson = {
  kind: "watch",
  id: "p0-watch",
  gameId: "pool",
  module: "0",
  moduleTitle: "Rules and cue-ball control",
  order: 0,
  title: "Watch: 8-ball rules and cue-ball control",
  goal: "Know how 8-ball is played, and how stun, follow and draw send the cue ball.",
  notes,
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

/** A straight pot into the side pocket with the cue ball sent `along` metres past the contact point (negative is back). */
function control(id: string, order: number, title: string, goal: string, ball: { x: number; y: number }, along: number, radius: number, tips: string[]): DrillLesson {
  const { striker, ghost, u } = cutLayout(table, POOL.ballRadius, ball, "mr", 0, 0.35);
  return {
    ...common,
    id,
    module: "2",
    moduleTitle: "Cue-ball control",
    order,
    title,
    goal,
    layout: [
      { id: "white", ...striker },
      { id: "ball1", x: ball.x, y: ball.y },
    ],
    success: { pot: { ball: "ball1", pockets: ["mr"] }, zone: { x: ghost.x + u.x * along, y: ghost.y + u.y * along, radius } },
    stars: [3, 5, 7],
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
  pot("p1-three-quarter", 4, "Three-quarter ball (15°)", "Pot the 1-ball with a gentle cut into the corner pocket.", { x: 0.95, y: 2.0 }, "tr", 15, 0.6, [4, 6, 8], [
    "Aim at the ghost ball, not at the 1-ball itself.",
  ]),
  pot("p1-long-straight", 5, "Long straight pot", "Pot the 1-ball straight into the corner from the far end of the table.", { x: 1.0, y: 2.15 }, "tr", 0, 1.25, [3, 5, 7], [
    "Long shots magnify small errors, so keep the cue moving straight through the ball.",
  ]),
  pot("p1-thin-cut", 6, "Thin cut (40°)", "Pot the 1-ball with a thin cut into the side pocket.", { x: 0.95, y: MID }, "mr", 40, 0.45, [2, 4, 6], [
    "Thin cuts need a precise line, and a touch more pace helps the ball hold it.",
  ], 1),
  control("p2-stun", 1, "Stun: stop the cue ball", "Pot the 1-ball straight and stop the cue ball inside the target circle.", { x: 0.9, y: MID }, 0, 0.13, [
    "Strike the centre of the cue ball so it is sliding, not rolling, when it arrives.",
  ]),
  control("p2-follow", 2, "Follow: roll on after the pot", "Pot the 1-ball and let the cue ball roll on into the target.", { x: 0.7, y: MID }, 0.28, 0.14, [
    "Hit above centre, and keep the pace gentle so the cue ball stays out of the pocket.",
  ]),
  control("p2-draw", 3, "Draw: bring it back", "Pot the 1-ball and draw the cue ball back into the target.", { x: 0.9, y: MID }, -0.3, 0.16, [
    "Hit below centre and follow through; do not stab at it.",
  ]),
];

export const poolLessons: Lesson[] = [watch, ...drills];
