# English Billiards

Physics: [physics.md](physics.md). Code: `src/games/billiards/`.

## Rules implemented

Three balls: your cue ball, your opponent's cue ball and a red. First to 50 wins.

| Stroke | Points |
|---|---|
| Cannon: your ball hits both others | 2 |
| Winning hazard: pot the red | 3 |
| Winning hazard: pot the opponent's ball | 2 |
| Losing hazard (in-off): your ball goes in after hitting the red first | 3 |
| Losing hazard: after hitting the opponent's ball first | 2 |

Scores add up within one shot. You play on after scoring. Hitting nothing gives your opponent 2.

Potted balls come back: the red to the billiards spot, the opponent's ball to the middle spot, and your ball to the D.

## Simplified from the full game

- The match target is 50 rather than a long timed or high-target game.
- Limits on consecutive hazards and cannons, and the opponent's ball staying off the table, are not implemented.

## Content

A reading lesson on the game and its three scoring shots, then drills for each way of scoring, in `index.ts`.
