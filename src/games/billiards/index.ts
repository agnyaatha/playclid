import type { Game } from "@/core/game";
import { cutLayout } from "@/core/lessons/geometry";
import { layoutOf } from "@/core/lessons/demo";
import type { AidName, Lesson, WatchLesson } from "@/core/lessons/schema";
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

const learn: WatchLesson = {
  kind: "watch",
  id: "b0-learn",
  gameId: "billiards",
  module: "0",
  moduleTitle: "How billiards works",
  order: 0,
  title: "The game and its three scoring shots",
  goal: "Know the three balls, the three ways to score, and why billiards rewards control more than potting.",
  videos: [],
  notes: [
    {
      heading: "Three balls on a snooker table",
      body: [
        "English billiards is played on a full-size snooker table with just three balls. You have your own cue ball, your opponent has theirs, and there is one red. Here your ball is the white and your opponent's is the yellow. Unlike snooker, nothing is cleared away: potted balls come back, and a break can go on for as long as you keep scoring.",
        "The red starts on the billiards spot, which is the black spot in snooker. You start from the D. In this app your opponent's ball starts on the centre spot.",
      ],
      demo: { caption: "The opening position: the white in the D, the yellow on the centre spot and the red on the billiards spot.", layout: layoutOf(billiards.createInitialBodies(table)) },
    },
    {
      heading: "Winning hazard: pot a ball",
      body: [
        "Potting the red scores 3, and potting your opponent's ball scores 2. Each comes straight back to its spot, so the red can be potted again and again from the same place. Top players build long breaks this way, especially off the billiards spot.",
      ],
      demo: {
        caption: "A winning hazard: the red is cut into the middle pocket for 3 points.",
        layout: [
          { id: "white", ...cutLayout(table, SNOOKER.ballRadius, red, "mr", 15, 0.5, 1).striker },
          { id: "red", ...red },
        ],
        shot: { aim: { pot: "red", pocket: "mr" }, power: 0.2, spin: { y: -0.2 } },
      },
    },
    {
      heading: "Losing hazard: the in-off",
      body: [
        "In snooker, your ball going into a pocket is a foul. In billiards it scores: 3 if your ball hit the red first, 2 if it hit your opponent's ball first. Your ball then comes back to the D, so an in-off from the red into a corner or middle pocket also sets you up for the next shot.",
        "The angle at which your ball leaves the object ball depends on how thick the contact is and on the spin, just like positional play in snooker. A half-ball contact is the most reliable, because small errors in the thickness barely change your ball's path.",
      ],
      demo: {
        caption: "A losing hazard: the white hits the red and runs on into the top corner for 3 points.",
        layout: [
          { id: "white", x: 0.9, y: 2.6 },
          { id: "red", x: 1.3, y: 3.05 },
        ],
        shot: { aim: { deg: 44 }, power: 0.45, spin: { y: -0.25 } },
        pots: ["white"],
        strikerPots: true,
      },
    },
    {
      heading: "The cannon",
      body: [
        "A cannon is your ball hitting both other balls in one shot, for 2 points. Cannons are how breaks keep going when nothing is on in the pockets. Gently nudged cannons that keep all three balls close together (nursery cannons) can run for hundreds of points.",
        "Points add up within one shot: a cannon followed by your ball going in-off can score 5.",
      ],
      demo: {
        caption: "A cannon: the white glances off the red and carries on to the yellow, for 2 points.",
        layout: [
          { id: "white", x: 0.89, y: 1.4 },
          { id: "red", x: 0.75, y: 2.2 },
          { id: "yellow", x: 1.05, y: 2.2 },
        ],
        shot: { aim: { deg: 19 }, power: 0.8, spin: { y: -0.25 } },
        cannon: 0,
      },
    },
    {
      heading: "Fouls and winning",
      body: [
        "If your ball fails to hit either ball, your opponent gets 2. Pushing the ball, striking it twice and the other snooker fouls apply too. Here the first player to 50 wins. Real matches run to a much higher target, or for a set time.",
      ],
    },
  ],
};

export const billiardsLessons: Lesson[] = [
  learn,
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
