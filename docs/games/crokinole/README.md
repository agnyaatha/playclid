# Crokinole

Physics: [physics.md](physics.md). Code: `src/games/crokinole/index.ts`.

## Rules implemented

One round of 6 discs each, taken in turns. The higher total wins.

| Where a disc ends | Points |
|---|---|
| In the centre hole | 20, banked at once |
| Inside the ring of pegs | 15 |
| Middle ring | 10 |
| Outer ring | 5 |
| In the ditch | 0, and the disc is removed |

If an opponent's disc is on the board, you must hit one. If you do not, your own disc comes off.

## Simplified from the full game

A full match has 12 discs each over several rounds, and a rule on the opening shot. Neither is implemented. All discs shoot from one side of the board.

## Not available

No computer opponent or practice-table coach. The drills' "show me" search does work here.

## Content

Four drills in `index.ts`.
