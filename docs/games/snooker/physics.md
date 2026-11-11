# Snooker physics

Shared behaviour: [physics engine](../../physics/README.md). Code: `table.ts`, `params.ts`, `strike.ts`, `index.ts` in `src/games/snooker/`.

## Table and balls

| Quantity | Value | Status |
|---|---|---|
| Playing area | 3.569 × 1.778 m | Standard (WPBSA) |
| Ball radius | 26.25 mm | Standard |
| Ball mass | 140.6 g | Measured |
| Baulk line | 0.737 m from the bottom cushion | Standard |
| D radius | 0.292 m | Standard |
| Black spot | 0.324 m from the top cushion | Standard |
| Corner pocket mouth | 89 mm | Estimate: pocket sizes vary and are not officially fixed |
| Middle pocket mouth | 102 mm | Estimate |

Pockets have jaws, with tips acting as bounce points. A corner mouth is measured between the two cushion tips, so each tip sits `mouth/√2` from the corner along its cushion.

## Parameters

`SNOOKER_PARAMS`.

| Parameter | Value | Status |
|---|---|---|
| Sliding friction | 0.212 | Measured: average of 0.178–0.245 |
| Rolling resistance | 0.0128 | Measured: 0.0127–0.0129 |
| Spin friction | 0.01 | Estimate |
| Ball-ball restitution | 0.95 | Published range 0.92–0.98 |
| Ball-ball friction | Alciatore's speed curve, about 0.11 slow to 0.01 fast | Published fit (measured on pool balls) |
| Cushion model | Mathavan | |
| Cushion restitution | 0.88 | **Calibrated** to a head-on rebound of about 0.825, against 0.818 measured. Falls above 2.5 m/s (estimate) |
| Cushion friction | 0.14 | Measured |
| Cushion contact height | 7/5 R | Measured |

## Cue

`DEFAULT_CUE`: 0.5 kg cue, tip restitution 0.75, offset limit 0.5 R, squirt 2.5° at half a radius (Alciatore's standard-shaft figure; snooker shafts were not measured). Maximum cue speed 5 m/s.

## Notes

- Ball in hand is limited to the D (`placeStriker`).
- A potted white returns to the middle of the D.

## Sources

Mathavan, Jackson & Parkin (2009, 2010) and Alciatore. See [the research notes](../../research/snooker-app-design.md).
