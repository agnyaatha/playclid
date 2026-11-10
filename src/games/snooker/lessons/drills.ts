import type { AidName, DrillLesson } from "@/core/lessons/schema";
import { cutLayout as sharedCutLayout } from "@/core/lessons/geometry";
import { colourSpots } from "../layout";
import { SNOOKER, createSnookerTable } from "../table";

const table = createSnookerTable();
const R = SNOOKER.ballRadius;
const MID = table.length / 2;
const round = (n: number) => Math.round(n * 1e4) / 1e4;

interface Pt {
  x: number;
  y: number;
}

function cutLayout(ball: Pt, pocketId: string, cutDeg: number, distance: number, side: 1 | -1 = 1) {
  return sharedCutLayout(table, R, ball, pocketId, cutDeg, distance, side);
}

const common: { kind: "drill"; gameId: "snooker"; aids: AidName[]; practiceAttempts: number; testAttempts: number } = {
  kind: "drill",
  gameId: "snooker",
  aids: ["aimLine", "ghostBall", "prediction"],
  practiceAttempts: 6,
  testAttempts: 4,
};

const potLesson = (
  id: string,
  order: number,
  title: string,
  goal: string,
  ball: Pt,
  pocket: string,
  cutDeg: number,
  distance: number,
  stars: [number, number, number],
  tips: string[],
  side: 1 | -1 = 1,
): DrillLesson => {
  const { striker } = cutLayout(ball, pocket, cutDeg, distance, side);
  return {
    ...common,
    id,
    module: "3",
    moduleTitle: "Aiming and potting",
    order,
    title,
    goal,
    layout: [
      { id: "white", ...striker },
      { id: "red1", x: ball.x, y: ball.y },
    ],
    success: { pot: { ball: "red1", pockets: [pocket] } },
    stars,
    tips,
  };
};

const straight = { x: 1.25, y: MID };

const m3: DrillLesson[] = [
  potLesson(
    "m3-straight-short",
    1,
    "Straight pot: short",
    "Pot the red into the middle pocket with the cue ball lined up straight behind it.",
    straight,
    "mr",
    0,
    0.4,
    [4, 6, 8],
    ["Aim through the centre of the cue ball, the red and the pocket.", "Use a smooth, medium pace and follow through."],
  ),
  potLesson(
    "m3-straight-medium",
    2,
    "Straight pot: medium",
    "Pot a straight red into the top corner pocket from a medium distance.",
    { x: 1.3, y: 2.9 },
    "tr",
    0,
    0.8,
    [4, 6, 8],
    ["Longer shots amplify small aiming errors, so keep your cue action straight."],
  ),
  potLesson(
    "m3-straight-long",
    3,
    "Straight pot: long",
    "Pot a straight red into the top corner pocket from a long way back.",
    { x: 1.45, y: 3.1 },
    "tr",
    0,
    1.6,
    [3, 5, 7],
    ["Take your time over the aim: the ghost ball helps, but only if you cue straight."],
  ),
  potLesson(
    "m3-three-quarter",
    4,
    "Three-quarter ball (about 15° cut)",
    "Pot the red with a gentle cut: the cue ball meets about three quarters of it.",
    straight,
    "mr",
    15,
    0.5,
    [4, 6, 8],
    ["Aim at the ghost ball: the spot where the cue ball must be when it touches the red."],
    1,
  ),
  potLesson(
    "m3-half-ball",
    5,
    "Half-ball cut (30°)",
    "Pot the red with a half-ball contact. This is the cut most angles are judged against.",
    { x: 1.4, y: MID },
    "mr",
    30,
    0.5,
    [3, 5, 7],
    ["A half-ball hit sends the red about 30° off the line of the cue ball.", "Try cutting both ways to learn each side."],
    -1,
  ),
  potLesson(
    "m3-thin-cut",
    6,
    "Thinner cut (40°)",
    "Pot a thin cut. Contact is lighter and the red needs a firmer line.",
    straight,
    "mr",
    40,
    0.5,
    [2, 4, 6],
    ["Thin cuts need accuracy more than power, and a little more pace helps the red hold its line."],
    1,
  ),
  potLesson(
    "m3-half-ball-left",
    7,
    "Half-ball cut from the other side",
    "The same 30° cut into the left middle pocket. Most players favour one side, so train the weaker one.",
    { x: table.width - 1.4, y: MID },
    "ml",
    30,
    0.5,
    [3, 5, 7],
    ["Keep your head still and let the line come to you.", "Compare this with the right-hand cut: is one side harder for you?"],
    1,
  ),
  potLesson(
    "m3-long-cut",
    8,
    "Long cut into the corner (15°)",
    "Pot a red into the top corner with a slight cut from distance: the shot that wins frames.",
    { x: 1.45, y: 3.1 },
    "tr",
    15,
    1.1,
    [2, 4, 6],
    ["At this range a tiny aiming error misses the pocket, so settle before you play.", "Roll the ball in at a moderate pace, and the pocket plays bigger."],
    -1,
  ),
];

const drill = (
  id: string,
  module: string,
  moduleTitle: string,
  order: number,
  title: string,
  goal: string,
  ball: Pt,
  pocket: string,
  distance: number,
  zone: (g: ReturnType<typeof cutLayout>) => { x: number; y: number; radius: number },
  stars: [number, number, number],
  tips: string[],
): DrillLesson => {
  const lay = cutLayout(ball, pocket, 0, distance);
  const z = zone(lay);
  return {
    ...common,
    id,
    module,
    moduleTitle,
    order,
    title,
    goal,
    layout: [
      { id: "white", ...lay.striker },
      { id: "red1", x: ball.x, y: ball.y },
    ],
    success: { pot: { ball: "red1", pockets: [pocket] }, zone: { x: round(z.x), y: round(z.y), radius: z.radius } },
    stars,
    tips,
  };
};

const m4: DrillLesson[] = [
  drill(
    "m4-stun",
    "4",
    "Cue-ball control",
    1,
    "Stun: stop the cue ball",
    "Pot the red straight and leave the cue ball where it hit: inside the target circle.",
    straight,
    "mr",
    0.35,
    ({ ghost }) => ({ ...ghost, radius: 0.12 }),
    [3, 5, 7],
    ["Hit the centre of the cue ball, with no follow or draw.", "A stun shot leaves the cue ball where it met the red."],
  ),
  drill(
    "m4-follow",
    "4",
    "Cue-ball control",
    2,
    "Follow: roll on after the pot",
    "Pot the red straight and let the cue ball roll on into the target circle.",
    { x: 0.95, y: MID },
    "mr",
    0.35,
    ({ ghost, u }) => ({ x: ghost.x + u.x * 0.32, y: ghost.y + u.y * 0.32, radius: 0.15 }),
    [3, 5, 7],
    ["Hit above the centre for topspin: the higher the tip, the further the cue ball follows.", "Keep the pace gentle so it does not follow into the pocket."],
  ),
  drill(
    "m4-screw",
    "4",
    "Cue-ball control",
    3,
    "Screw: bring the cue ball back",
    "Pot the red straight and draw the cue ball back towards where it started.",
    straight,
    "mr",
    0.35,
    ({ ghost, u }) => ({ x: ghost.x - u.x * 0.35, y: ghost.y - u.y * 0.35, radius: 0.2 }),
    [3, 5, 7],
    ["Hit below the centre for backspin and follow through firmly.", "More pace and a lower tip draw the cue ball further."],
  ),
  drill(
    "m4-run-through",
    "4",
    "Cue-ball control",
    4,
    "Long follow: run through",
    "Pot the red and let the cue ball run on a long way, into a target near the far side.",
    { x: 0.65, y: MID },
    "mr",
    0.3,
    ({ ghost, u }) => ({ x: ghost.x + u.x * 0.6, y: ghost.y + u.y * 0.6, radius: 0.18 }),
    [2, 4, 6],
    ["A high tip and a firmer stroke carry the cue ball further.", "Judge the pace by the cue ball, not the red."],
  ),
  drill(
    "m4-deep-screw",
    "4",
    "Cue-ball control",
    5,
    "Deep screw: a long way back",
    "Pot the red and screw the cue ball back past where it started.",
    straight,
    "mr",
    0.3,
    ({ ghost, u }) => ({ x: ghost.x - u.x * 0.55, y: ghost.y - u.y * 0.55, radius: 0.2 }),
    [2, 4, 6],
    ["Get low on the cue ball and accelerate through it.", "Distance back comes from spin, so do not just hit harder."],
  ),
];

const m8: DrillLesson[] = [
  (() => {
    const black = { x: table.width / 2, y: table.length - SNOOKER.blackFromTop };
    const { striker } = cutLayout(black, "tr", 0, 0.6);
    return {
      ...common,
      id: "m8-black-spot",
      module: "8",
      moduleTitle: "Practice routines",
      order: 1,
      title: "Black off its spot",
      goal: "Pot the black from its spot into the top corner: a classic routine drill.",
      layout: [
        { id: "white", ...striker },
        { id: "black", spot: "black" },
      ],
      success: { pot: { ball: "black", pockets: ["tr"] } },
      stars: [4, 6, 8],
      tips: ["The black is potted from here again and again in a frame, so repeating it builds a reliable routine."],
    } satisfies DrillLesson;
  })(),
  ...(
    [
      ["m8-pink-spot", 2, "Pink off its spot", "pink", "tl", 0, "Pot the pink from its spot into the top corner, the shot before the black in a clearance."],
      ["m8-blue-middle", 3, "Blue into the middle", "blue", "mr", 10, "Pot the blue from its spot into the middle pocket, a key shot when building a break."],
    ] as const
  ).map(([id, order, title, ball, pocket, cut, goal]): DrillLesson => {
    const { striker } = cutLayout(colourSpots(table)[ball], pocket, cut, 0.55);
    return {
      ...common,
      id,
      module: "8",
      moduleTitle: "Practice routines",
      order,
      title,
      goal,
      layout: [
        { id: "white", ...striker },
        { id: ball, spot: ball },
      ],
      success: { pot: { ball, pockets: [pocket] } },
      stars: [3, 5, 7],
      tips: ["Play it the same way every time, so the routine holds up under pressure."],
    };
  }),
];

export const drillLessons: DrillLesson[] = [...m3, ...m4, ...m8];
