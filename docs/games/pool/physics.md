# 8-Ball Pool physics

Shared behaviour: [physics engine](../../physics/README.md). Code: `table.ts`, `params.ts`, `index.ts` in `src/games/pool/`.

## Table and balls

| Quantity | Value | Status |
|---|---|---|
| Playing area | 2.54 × 1.27 m (9 ft) | Standard |
| Ball radius | 28.575 mm (2.25 in balls) | Standard |
| Ball mass | 170 g | Standard |
| Corner pocket mouth | 114.3 mm | Estimate: varies by table |
| Side pocket mouth | 127 mm | Estimate |

The table is built by the same `buildCushionedTable` as snooker: jaws and tips at all six pockets.

## Parameters

`POOL_PARAMS`.

| Parameter | Value | Status |
|---|---|---|
| Sliding friction | 0.2 | Published typical value |
| Rolling resistance | 0.01 | Published range 0.005–0.015 |
| Spin friction | 0.01 | Estimate |
| Ball-ball restitution | 0.95 | Published range |
| Ball-ball friction | Alciatore's speed curve, about 0.11 slow to 0.01 fast | Published fit |
| Cushion model | Mathavan | |
| Cushion restitution | 0.93, falling above 2.5 m/s | **Estimate**, not calibrated. Set livelier than snooker's 0.88 |
| Cushion friction | 0.14 | Estimate, from snooker |
| Cushion contact height | 1.27 R | Standard: WPA nose height is 63.5% of the ball's diameter |

## Cue

`POOL_CUE`: 0.54 kg (19 oz) cue, tip restitution 0.75, offset limit 0.5 R, squirt 2.5° at half a radius (standard shaft, measured by Alciatore). Maximum cue speed 9 m/s, which sends the cue ball off at about 12 m/s, the top of the range for pro breaks.

## Notes

- Ball in hand may go anywhere clear of other balls. After a foul it starts on the head spot, and the player can move it.
- The cushion value is the first thing to calibrate if real pool footage becomes available.
