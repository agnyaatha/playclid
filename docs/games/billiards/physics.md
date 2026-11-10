# English Billiards physics

Shared behaviour: [physics engine](../../physics/README.md).

English Billiards reuses the [snooker table, balls, parameters and cue](../snooker/physics.md) unchanged, by spreading the `snooker` game object. Billiards and snooker cloth and balls are close enough that no separate values have been measured here.

| Difference | Value |
|---|---|
| Balls | White, yellow (the other cue ball) and red |
| Starting position | White in the D, yellow on the middle spot, red on the billiards spot (the snooker black spot) |

## Two cue balls

The app always strikes the body called `white`. When the turn passes, `swapCueBalls` trades the positions of `white` and `yellow`, so the player at the table always sees their own ball as white. Positions stay physically correct; only the labels move.

## In-off detection

`scanCannon` follows the striker through the event list to see what it hit and in what order. An in-off scores from the first ball hit.
