# Shuffleboard

Physics: [physics.md](physics.md). Code: `src/games/shuffleboard/index.ts`.

## Rules implemented

Players alternate 4 pucks each per round. First to 15 wins, and a level score plays on.

| Zone, measured from the far end | Points |
|---|---|
| Last 0.15 m | 3 |
| 0.15–0.6 m | 2 |
| 0.6–1.2 m | 1 |

Only the player with the furthest puck scores, for each of their pucks beyond the opponent's best. A puck over the end is out.

## Not available

No computer opponent or practice-table coach. The drills' "show me" search does work here.

## Content

Three drills in `index.ts`.
