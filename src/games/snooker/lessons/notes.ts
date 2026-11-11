import { cutLayout } from "@/core/lessons/geometry";
import type { LayoutBall, NoteSection } from "@/core/lessons/schema";
import { colourSpots, redPositions } from "../layout";
import { SNOOKER, createSnookerTable } from "../table";

const table = createSnookerTable();
const R = SNOOKER.ballRadius;
const MID = table.length / 2;
const CX = table.width / 2;
const spots = colourSpots(table);
const COLOURS: LayoutBall[] = (["yellow", "green", "brown", "blue", "pink", "black"] as const).map((id) => ({ id, spot: id }));

/** The full set-up for a frame, with the white in the D. */
const FULL_TABLE: LayoutBall[] = [{ id: "white", x: CX + 0.12, y: SNOOKER.baulkLine - 0.12 }, ...COLOURS, ...redPositions(table)];

/** The line-up: fifteen reds along the centre line between the blue and the black, clear of the pink and black spots. */
const LINE_UP: LayoutBall[] = (() => {
  const reds: LayoutBall[] = [];
  for (let y = spots.blue.y + 0.09; reds.length < 15 && y < spots.black.y - 0.06; y += 0.07) {
    if (Math.abs(y - spots.pink.y) < 0.065) continue;
    reds.push({ id: `red${reds.length + 1}`, x: CX, y: Math.round(y * 1e4) / 1e4 });
  }
  return [{ id: "white", x: CX - 0.1, y: SNOOKER.baulkLine - 0.1 }, ...COLOURS, ...reds];
})();

/** A straight pot into the left middle pocket, the white 0.4 m behind, used for stun, screw and top. */
const STRAIGHT_MIDDLE: LayoutBall[] = [
  { id: "white", x: 0.95, y: MID },
  { id: "red1", x: 0.55, y: MID },
];

const halfBall = cutLayout(table, R, { x: 0.5, y: 3.0 }, "tl", 30, 0.6);
const HALF_BALL: LayoutBall[] = [
  { id: "white", ...halfBall.striker },
  { id: "red1", x: 0.5, y: 3.0 },
];

const offBlack = cutLayout(table, R, spots.black, "tl", 30, 0.4, -1);

/** Notes for each watch lesson, by lesson id. */
export const snookerNotes: Record<string, NoteSection[]> = {
  "m0-watch": [
    {
      heading: "The table and the balls",
      body: [
        "A full-size snooker table has a playing area of about 3.57 m by 1.78 m (12 ft by 6 ft), with six pockets: one in each corner and one in the middle of each long side. The end you break from is baulk. The baulk line runs across the table 74 cm from the baulk cushion, and the D is a half-circle on that line, 29 cm in radius.",
        "There are 22 balls: the white cue ball, 15 reds worth 1 point each, and six colours. You only ever strike the white.",
      ],
      points: [
        "Yellow 2, green 3 and brown 4 sit on the baulk line: yellow on the right corner of the D, green on the left, brown in the middle.",
        "Blue 5 sits in the exact centre of the table.",
        "Pink 6 is halfway between the blue and the top cushion, and the reds are racked in a triangle just behind it.",
        "Black 7 sits on its spot 32 cm from the top cushion.",
      ],
      demo: { caption: "Every ball on its spot, ready for the break-off. The white can start anywhere in the D.", layout: FULL_TABLE },
    },
    {
      heading: "How a frame is played",
      body: [
        "While reds remain, you must pot a red, then a colour of your choice, then a red, then a colour, and so on. Each potted colour comes back to its spot. Your turn (a visit) carries on for as long as you keep potting; the points you score in one visit are your break.",
        "When the last red has gone and you have taken a colour after it, the colours are potted in order of value, yellow first and black last, and they stay down. The highest score wins the frame. If scores are level after the black, the black is re-spotted and the first player to score wins.",
        "The maximum break is 147: all 15 reds with the black after each one, then all six colours.",
      ],
    },
    {
      heading: "Fouls",
      body: [
        "A foul ends your visit and gives your opponent points: 4, or the value of the highest ball involved if that is more, up to 7. Your opponent can then play from where the balls lie or ask you to play again.",
      ],
      points: [
        "Missing the ball you are on, or hitting a different ball first.",
        "Potting the white (an in-off).",
        "Potting a ball you were not on.",
        "Touching any ball with anything other than the cue tip, or striking the white twice.",
        "Playing without at least one foot on the floor.",
        "If a foul leaves you unable to hit both sides of the ball you are on, you may get a free ball: you can nominate any colour as if it were the ball on.",
      ],
    },
    {
      heading: "Your equipment",
      body: [
        "A snooker cue is usually about 145 cm (57 in) long and weighs 16 to 19 oz, with a tip of 9 to 10 mm. Choose a cue that feels balanced, not one that is as heavy as possible. Chalk the tip lightly before most shots: a dry tip is the most common cause of a miscue.",
      ],
    },
  ],

  "m1-watch": [
    {
      heading: "Behaviour at the table",
      body: [
        "Snooker is played in near silence, and good etiquette is half of being welcome at a club. None of these rules are written down in the laws, but every regular player follows them.",
      ],
      points: [
        "When your opponent is down on a shot, stand still, out of their line of sight, and do not talk.",
        "Stay in your seat while it is not your turn. Do not walk around the table to look at a shot.",
        "Call your own fouls, even if nobody else saw them, such as touching a ball with your sleeve.",
        "Never sit on the table or lean on it with a drink. Brush chalk dust off the cloth, and don't rest a cue on it.",
        "Shake hands before and after the frame, and concede graciously when you cannot win.",
      ],
    },
    {
      heading: "Keeping score",
      body: [
        "Keep a running total for each player, adding the value of each ball potted and any foul points awarded. Learn the points still on the table, because that number drives your tactics.",
        "With all 15 reds up there are 147 points available. Each red that goes down is worth up to 8 (the red and the black), and the colours together are worth 27. So the points remaining are 8 × (reds left) + 27.",
        "If you are further behind than the points remaining, you need snookers: you have to win foul points from your opponent to catch up. Once your opponent is ahead by more than the points left, there is no path back without snookers. Many players concede at that point.",
      ],
      points: ["Example: 6 reds left means 6 × 8 + 27 = 75 points remaining.", "Once the reds are gone, 27 points remain: 2 + 3 + 4 + 5 + 6 + 7."],
    },
  ],

  "m2-watch": [
    {
      heading: "Stance",
      body: [
        "Your stance is the platform for everything else. Stand with your back foot (the right foot, if you are right-handed) on the line of the shot and turned slightly out, and step your front foot forward and to the left. Most of your weight goes on the front leg, and the back leg stays straight.",
        "Bend from the hips until your chin is just above the cue. When you strike, only your forearm swings: your head, body and upper arm stay still.",
      ],
      points: [
        "At the moment the tip meets the white, your cueing forearm should hang vertically.",
        "The cue should brush your chest or chin, so it has a fixed point to run against.",
        "If you feel unbalanced, ask someone to push your shoulder gently while you are down. A good stance does not move.",
      ],
    },
    {
      heading: "Grip and bridge",
      body: [
        "Hold the butt of the cue loosely with your thumb and first two fingers, about level with your back hip. The back fingers only cradle it. A tight grip twists the cue sideways and puts unwanted side on the white.",
        "Make the bridge by spreading your fingers flat on the cloth, then raising your knuckles and pressing your thumb against the side of your first finger to form a groove. The cue slides in that groove. Keep the bridge about 25 to 30 cm from the white. Shorten it for delicate shots or when another ball is in the way.",
      ],
    },
    {
      heading: "Cueing straight",
      body: [
        "The aim of the cue action is to deliver the tip along a straight line, at the speed you choose, without moving anything else. Take a few slow feathering strokes to settle your aim. Then make a smooth backswing, pause briefly at the back, and accelerate through the white. Follow through about 15 cm past where the white was.",
        "The classic test needs no object ball. Put the white on the brown spot and play it up the table over the blue, pink and black spots. If you cue straight with no side, it comes off the top cushion and back down the same line to your tip.",
      ],
      demo: {
        caption: "A straight cue sends the white over the blue, pink and black spots and back down the same line. Any curve or drift means the tip was not on the centre.",
        layout: [{ id: "white", spot: "brown" }],
        shot: { aim: { deg: 90 }, power: 0.35 },
      },
    },
    {
      heading: "A pre-shot routine",
      body: [
        "Do the same things, in the same order, before every shot. Choose the shot standing up. Chalk. Step into the line from behind the white. Get down, take the same number of feathers, pause, and strike. A routine keeps you calm under pressure, because each shot is just the familiar sequence again.",
      ],
    },
  ],

  "m3-watch": [
    {
      heading: "The line of the pot",
      body: [
        "To pot a ball, the white must strike it at the point exactly opposite the pocket. Picture a line from the centre of the pocket through the object ball. Where that line comes out of the back of the ball is the contact point.",
        "On a straight pot the white, the object ball and the pocket all lie on one line, so you simply hit the object ball full in the face. These are the shots to learn first: they show at once whether you are cueing straight.",
      ],
      demo: {
        caption: "A straight pot into the middle pocket: the white, the red and the pocket are all on one line.",
        layout: [
          { id: "white", x: 0.75, y: MID },
          { id: "red1", x: 1.25, y: MID },
        ],
        shot: { aim: { pot: "red1", pocket: "mr" }, power: 0.25 },
      },
    },
    {
      heading: "The ghost ball",
      body: [
        "On a cut, you cannot aim at the contact point itself, because the white would arrive too far round the ball. Instead, imagine a second white touching the object ball on the line of the pot: the ghost ball. Send the real white to where the ghost is, and the object ball goes toward the pocket.",
        "The bigger the angle between the line of aim and the line of the pot, the thinner the contact and the less of the object ball you see covered by the white.",
      ],
      points: [
        "Full ball: aim at the centre of the object ball. The pot is straight (0°).",
        "Three-quarter ball: aim a quarter of a ball's width off centre. The object ball goes off at about 15°.",
        "Half ball: aim the centre of the white at the edge of the object ball. It goes off at about 30°. This is the easiest cut to judge.",
        "Quarter ball: aim the edge of the white past the object ball's edge, a quarter overlap. It goes off at about 49°.",
      ],
      demo: {
        caption: "A half-ball cut into the top corner. The ring is the ghost ball: send the white there and the red goes off at 30° to the line of aim.",
        layout: HALF_BALL,
        shot: { aim: { pot: "red1", pocket: "tl" }, power: 0.3 },
        showPath: true,
      },
    },
    {
      heading: "Throw: why slow cuts finish short of the angle",
      body: [
        "Friction between the two balls at contact drags the object ball slightly in the direction the white was travelling. On a half-ball cut this throw is a degree or two, which is enough to miss a long pot. It is largest on slow shots and at angles around half ball, and smaller when you hit firmly.",
        "Allow for it by aiming a fraction thinner on slow cuts. Most players learn the correction by feel rather than by calculation, which is why practising cut angles at different paces matters.",
      ],
    },
  ],

  "m4-watch": [
    {
      heading: "Where you hit the white",
      body: [
        "Hitting the white at different heights gives it different spin. Spin changes what the white does after it meets the object ball. The object ball barely notices.",
        "A white struck in the centre starts by sliding, and the cloth soon turns that slide into natural forward roll. What the white does at contact depends on whether it is still sliding or already rolling when it arrives.",
      ],
      points: [
        "Stun: a little below centre, so the white is still sliding with no spin when it reaches the object ball.",
        "Screw (draw): well below centre, so the white is still spinning backwards at contact.",
        "Top (follow): above centre, so the white is rolling forward at contact.",
      ],
    },
    {
      heading: "Stun: stop the white dead",
      body: [
        "On a straight pot, a sliding white with no spin gives all of its speed to the object ball and stops on the spot. This stop shot is the most useful shot in the game. It is how you stay in position on the black.",
        "The further the white has to travel, the lower you must hit it, or the harder, so that the backspin survives just long enough to wear off at contact.",
      ],
      demo: {
        caption: "Stun: struck a little below centre, the white arrives with no spin and stops where the red was.",
        layout: STRAIGHT_MIDDLE,
        shot: { aim: { pot: "red1", pocket: "ml" }, power: 0.3, spin: { y: -0.25 } },
      },
    },
    {
      heading: "Screw: bring the white back",
      body: [
        "Strike low, half a ball's radius below centre, with a smooth, accelerating cue and a full follow-through. The white is still spinning backwards when it hits the object ball. It stops for an instant, then the backspin grips the cloth and pulls it back toward you.",
        "Keep the cue as level as you can and do not jab: screw comes from a clean low contact and cue speed, not from force.",
      ],
      demo: {
        caption: "Screw: struck low, the white comes back about 30 cm after potting the red.",
        layout: STRAIGHT_MIDDLE,
        shot: { aim: { pot: "red1", pocket: "ml" }, power: 0.4, spin: { y: -0.5 } },
      },
    },
    {
      heading: "Top: let the white follow",
      body: [
        "Strike above centre and the white rolls forward from the start. After contact it pauses, then its forward spin carries it on after the object ball. A soft top-spin shot follows a short distance. Hit harder and it can follow into the pocket for an in-off, so watch the pace.",
      ],
      demo: {
        caption: "Top: struck above centre, the white follows on after the red toward the pocket.",
        layout: STRAIGHT_MIDDLE,
        shot: { aim: { pot: "red1", pocket: "ml" }, power: 0.2, spin: { y: 0.4 } },
      },
    },
    {
      heading: "The 90° rule",
      body: [
        "On a cut, a stunned white leaves the object ball at a right angle to the object ball's path, along the tangent line. This holds at any cut angle and is the starting point for predicting where the white will go.",
        "A rolling white bends forward off that tangent line. Around a half-ball contact it leaves at about 30° to its original line. Screw bends it back behind the tangent line.",
      ],
      demo: {
        caption: "A stun cut. The predicted paths show the white leaving at 90° to the red's line, then running off the cushion.",
        layout: HALF_BALL,
        shot: { aim: { pot: "red1", pocket: "tl" }, power: 0.3, spin: { y: -0.15 } },
        showPath: true,
      },
    },
    {
      heading: "A first look at side",
      body: [
        "Side (left or right of centre) changes the angle at which the white comes off a cushion. Running side widens it, and check side narrows it. But side also pushes the white off your line of aim (squirt) and makes it curve slightly on the cloth (swerve), so it makes the pot harder.",
        "Leave side alone until stun, screw and top feel reliable. When you do use it, use as little as you need.",
      ],
    },
  ],

  "m5-watch": [
    {
      heading: "Think one ball ahead",
      body: [
        "Potting balls is half the game. The other half is where the white stops. Before every shot, decide which ball you will play next and where the white must finish to pot it comfortably. Then choose the pace and spin that get it there.",
        "Aim for a zone, not a point. A zone is an area from which the next pot is easy and the white can get on to the ball after that.",
      ],
      points: [
        "Leave yourself a small angle on the next ball rather than a dead straight pot. An angle lets you move the white on with stun or roll; a straight pot only allows screw or follow along the same line.",
        "Stay on the correct side of the next ball, the side from which the white naturally runs toward the ball after.",
        "Keep the white near the middle of the table and away from cushions, where cueing is awkward.",
        "Choose the simplest route. A short movement with plain ball is better than a long one with spin.",
      ],
    },
    {
      heading: "Building a break round the black",
      body: [
        "Most big breaks are built on reds near the black and pink. After each red, take the black if you can. A cut on the black lets the white come off the cushion and back among the reds for the next one. When the black is blocked, the pink and blue are your alternatives.",
        "Open the pack early, while you still have plenty of colours to fall back on. Do not leave it until the last few loose reds are gone.",
      ],
      demo: {
        caption: "A plain-ball cut on the black: the black goes in, and the white comes off the top cushion back into the middle (the circle), where the reds are.",
        layout: [
          { id: "white", ...offBlack.striker },
          { id: "black", spot: "black" },
        ],
        shot: { aim: { pot: "black", pocket: "tl" }, power: 0.3 },
        zone: { x: 0.91, y: 2.92, radius: 0.12 },
      },
    },
    {
      heading: "Clearing the colours",
      body: [
        "Once the reds are gone, the colours come in a fixed order, so you can plan the whole clearance in advance. The classic route is to go from yellow to green to brown in baulk, run down to the blue, then the pink and the black. Each shot sets up the angle for the next, and stun with a little run-through does most of the work.",
      ],
    },
  ],

  "m6-watch": [
    {
      heading: "What makes a good safety",
      body: [
        "When there is no pot you are confident of, play safe: leave your opponent with nothing to pot and a hard shot to play. The best safeties put distance between the white and the object balls, usually by sending the white back to the baulk cushion while the reds stay at the far end.",
      ],
      points: [
        "Leave the white close to a cushion. Your opponent then has to cue awkwardly off the rail.",
        "Leave no red near a pocket, with no clear line from the white.",
        "Hit the object ball thinly, so it barely moves and the white keeps most of its pace.",
      ],
      demo: {
        caption: "A thin safety: the white just clips the red, which hardly moves, then comes off the top cushion and returns to baulk.",
        layout: [
          { id: "white", x: 0.75, y: 0.9 },
          { id: "red1", x: 0.95, y: 3.35 },
        ],
        shot: { aim: { toward: { x: 0.95 + 1.7 * R, y: 3.35 } }, power: 0.45 },
      },
    },
    {
      heading: "Snookers",
      body: [
        "You are snookered when another ball blocks the straight path from the white to both sides of the ball you are on. Laying a snooker on purpose, often by rolling the white behind a baulk colour, forces your opponent to play off cushions, and a miss gives you foul points. Late in a frame, snookers are how a player who is behind wins points back.",
      ],
    },
    {
      heading: "Escaping off a cushion",
      body: [
        "To escape, find the point on a cushion that bounces the white onto the object ball. Without spin, the white comes off a cushion at roughly the angle it went in. So aim at the mirror image of the object ball: as far beyond the cushion as the ball is in front of it. Measure to the line the ball's centre travels on, a ball's radius in from the cushion.",
        "Pace changes the angle. A firm shot comes off a little narrower and a slow one a little wider, so play escapes at a medium, controlled pace.",
        "If you fail to hit the ball on and the referee judges that you did not make a good enough attempt, they can call a miss and have you play the shot again. Always try a genuine escape.",
      ],
      demo: {
        caption: "Snookered behind the brown: aiming at the red's mirror image beyond the side cushion brings the white round to hit it.",
        layout: [
          { id: "white", x: CX, y: 0.45 },
          { id: "brown", spot: "brown" },
          { id: "red1", x: CX, y: 1.15 },
        ],
        shot: { aim: { toward: { x: 2 * (table.width - R) - CX, y: 1.15 } }, power: 0.3 },
      },
    },
  ],

  "m7-watch": [
    {
      heading: "The rest",
      body: [
        "When you cannot reach the white with a normal bridge, use the rest (a cross-shaped head on a long stick). The technique is different, and it is worth practising, because a poor rest shot loses frames.",
      ],
      points: [
        "Lay the rest flat on the cloth, a little to the left of the line of aim (for a right-hander), and hold it down firmly with your left hand.",
        "Place the cue in the higher groove for most shots and the lower one for screw.",
        "Hold the butt with your fingertips and thumb, with your elbow out sideways. Swing your forearm in a horizontal line, like pushing a door, rather than the usual pendulum.",
        "Keep your head over the cue and your eyes on the line. Stay still until the white has gone.",
      ],
    },
    {
      heading: "Spider, swan-neck and extensions",
      body: [
        "The spider raises the cue over a ball that is in the way. The swan-neck reaches round an intervening ball, so the cue can come down at a gentler angle. An extended spider or a screw-on extension gives you reach over a long distance. All are used the same way as the rest. The raised cue makes the shot less accurate, so hit nearer the centre and with less pace.",
      ],
    },
    {
      heading: "Awkward bridges",
      body: [
        "With the white close to a cushion, bridge on the rail: put your fingers on the cushion and the cue between your first two fingers, or against your thumb. You can only strike the top half of the white, so screw is limited. When a ball sits just behind the white, raise your bridge on your fingertips and lift the butt. Keep the cue as level as the obstruction allows, because a steeply angled cue puts swerve on the white.",
      ],
    },
  ],

  "m8-watch": [
    {
      heading: "Practise with a purpose",
      body: [
        "Knocking balls about feels like practice but teaches little. Short blocks of set routines with a score, written down every time, show you what is improving and what is not. Twenty focused minutes beat two hours of casual potting.",
      ],
      points: [
        "Straight pots: a ball on the blue spot into a middle pocket, then a ball on the black spot into a corner. Score out of 10.",
        "Stun and screw lengths: the same straight pot, finishing the white in a marked zone.",
        "Black off the spot: pot the black from different angles, staying in position for another black.",
        "Clearing the colours: all six from their spots, counting how far you get.",
      ],
    },
    {
      heading: "The line-up",
      body: [
        "The line-up is the routine most professionals use. The reds go in a line up the middle of the table, from the blue toward the black, with the colours on their spots. Pot red, colour, red, colour, as in a frame, and try to clear the lot. Because the reds are all on one line, every shot is a positional question: which side of the next red do you need to be?",
        "Keep a log of your highest clearance. When you can regularly score 50 or more, start the reds in tighter clusters.",
      ],
      demo: { caption: "The line-up: fifteen reds along the centre line, with the colours on their spots.", layout: LINE_UP },
    },
  ],

  "m9-watch": [
    {
      heading: "Reading your misses",
      body: [
        "A miss tells you something if you notice how it missed. Before blaming the aim, look at the pattern over several shots.",
      ],
      points: [
        "Missing to the same side every time points to aim or alignment: your eye is not over the line, or your stance turns you off it. Check that your chin is directly above the cue.",
        "Missing randomly to both sides points to the cue action: the cue is wobbling or your body is moving. Check your grip and that your head stays still.",
        "Missing thin on long cuts often comes from throw and slow pace. Hit a little firmer, or aim a touch thinner.",
        "On a straight pot, if the white does not come back along its line, you put side on it.",
      ],
    },
    {
      heading: "Unintended side",
      body: [
        "A small offset you did not mean to put on the white does two things. It sends the white slightly off the line of aim (squirt), away from the side you struck. It also turns the white's spin into a sideways push on the cloth (swerve). Over a long pot, either one can turn a perfect aim into a miss.",
        "The cure is a straight delivery with a loose grip, and checking the tip position on the white during your last feathers.",
      ],
      demo: {
        caption: "Aimed perfectly for a straight pot, but struck right of centre: squirt pushes the white off line and the red misses the pocket.",
        layout: [
          { id: "white", x: 0.3, y: MID },
          { id: "red1", x: 1.25, y: MID },
        ],
        shot: { aim: { pot: "red1", pocket: "mr" }, power: 0.35, spin: { x: 0.5 } },
        misses: true,
      },
    },
    {
      heading: "Other habits to check",
      body: [
        "Get someone to film you from behind and from the side.",
      ],
      points: [
        "Lifting your head or body as you strike, to see if the ball is going in. Stay down until the object ball has dropped.",
        "A rushed backswing. Pause at the back, then accelerate smoothly.",
        "A short or stabbing follow-through. Let the cue run through past the white.",
        "Hitting too hard. Most pots are easier at medium pace, and positional play is easier too.",
      ],
    },
  ],

  "m10-watch": [
    {
      heading: "One shot at a time",
      body: [
        "Under pressure, the mind jumps ahead to the result or back to the last miss. Bring it back to the shot in front of you with your pre-shot routine. Choose the shot, commit to it, and play it the same way you would in practice. When the routine is automatic, it carries you through the nervous moments.",
      ],
      points: [
        "Breathe out slowly before you get down on a pressure shot.",
        "Keep your tempo: nerves speed you up. Take a moment longer, not shorter.",
        "Choose the shot you can play well, not the most spectacular one. Safety is not a failure.",
        "After a miss, sit down and let it go. The next visit is a new problem.",
      ],
    },
    {
      heading: "Learning from the pros",
      body: [
        "When you watch professional snooker, watch the white rather than the object ball. Before each shot, guess where the player wants the white to finish. Then see how close they get, and how they got there: with stun, screw or roll, and how much pace.",
        "Notice how rarely they use side, how often they play a plain-ball shot, and how they turn down risky pots for safety. Watch their pre-shot routines too, and how unhurried they are on the important balls.",
      ],
    },
    {
      heading: "Playing matches",
      body: [
        "Play regularly against someone at your level or a little above. Match play teaches what practice cannot: choosing between attack and safety, reading the score, and keeping calm. After each match, write down one thing that went well and one thing to practise.",
      ],
    },
  ],
};
