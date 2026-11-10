# Crokinole physics

Shared behaviour: [physics engine](../../physics/README.md). Code: `src/games/crokinole/index.ts`.

## Board and discs

| Quantity | Value | Status |
|---|---|---|
| Playing radius | 0.30 m | Estimate, near a standard board |
| Ditch outer wall | 0.335 m | Estimate |
| 15 ring and peg circle radius | 0.10 m | Estimate |
| 10 ring radius | 0.20 m | Estimate |
| Shooting line radius | 0.285 m | Estimate |
| Disc radius | 15.9 mm | Estimate |
| Disc mass | 6.5 g | Estimate |
| Hole radius (drawn) | About 21 mm | Estimate |
| Hole catch radius | About 11.6 mm | Tuned for play |

## How the board is built

| Feature | Built from |
|---|---|
| Round ditch wall | 72 short [cushion segments](../../physics/tables-and-pockets.md) |
| 8 pegs | Jaw-tip points on the 0.10 m circle, placed so the straight line to the centre passes between them. A peg has no size of its own |
| 20 hole | A speed-limited hole at the centre |
| Ditch | The ring between 0.30 and 0.335 m. Any disc resting past 0.30 m is removed after the shot |

## The hole

A disc only drops if its centre comes within the catch radius **and** it is moving at 0.8 m/s or less. A faster one skims across and carries on. The catch radius is deliberately smaller than the drawn hole, so a disc has to arrive close to the middle.

## Parameters

`PARAMS`. All are estimates.

| Parameter | Value |
|---|---|
| Sliding and rolling friction | 0.12 |
| Spin friction | 0.05 |
| Disc-disc restitution | 0.9 |
| Disc-disc friction | 0.03 |
| Cushion model | Impulse |
| Cushion restitution | 0.45 |
| Cushion friction | 0.1 |
| Contact height | 1 R |

## Strike

A [flick](../../physics/strikes.md), maximum speed 3 m/s, from a point on the shooting line. The placement control moves it up to 1 radian either way round the line.

## Limits

- One restitution value covers the wall and the pegs. Real rubber pegs are livelier than the ditch wall.
- A disc can rebound off the outer wall back onto the board and count, which a real ditch prevents.
- Discs use [sphere inertia and the sliding-disc approach](../carrom/physics.md).
