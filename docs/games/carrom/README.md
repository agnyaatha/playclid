# Carrom

Physics: [physics.md](physics.md). Code: `src/games/carrom/`.

## Rules implemented

`rules.ts`. Player 1 plays white and Player 2 black. The first to clear all nine of their coins wins.

- An own coin scores 1 and you shoot again. Pocketing nothing of your colour passes the turn.
- An opponent's coin counts for the opponent.
- **Queen:** worth 3, but only once covered by pocketing one of your own coins on the same or the next shot. If the cover is missed, she returns to the centre.
- **Striker foul:** coins pocketed on that shot come back. If none of your coins went in on that shot, you also forfeit one earlier coin, which returns to the board.
- The striker returns to the baseline after every shot, clear of any coin resting there.

## Simplified from the full game

It is a single frame to clear your coins, with one baseline used by both players, rather than scored boards.

## Content

Two modules of drills and nine challenges.
