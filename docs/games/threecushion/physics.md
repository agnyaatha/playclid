# Three-Cushion physics

Shared behaviour: [physics engine](../../physics/README.md). Code: `src/games/threecushion/index.ts`.

## Table and balls

| Quantity | Value | Status |
|---|---|---|
| Playing area | 2.84 × 1.42 m | Standard match table |
| Ball radius | 30.75 mm | Standard (61.5 mm balls) |
| Ball mass | 210 g | Standard |
| Pockets | None | |

Four unbroken cushions meet at the corners. A ball arriving in a corner touches them one after the other, which is why corners are the quickest route to three cushions.

## Parameters

`THREE_PARAMS`: the [pool parameters](../pool/physics.md) with rolling resistance changed.

| Parameter | Value | Status |
|---|---|---|
| Sliding friction | 0.2 | Estimate, from pool |
| Rolling resistance | 0.012 | Estimate |
| Spin friction | 0.01 | Estimate, from pool |
| Ball-ball restitution | 0.95 | Estimate, from pool |
| Ball-ball friction | Alciatore's speed curve | From pool |
| Cushion model | Mathavan | |
| Cushion restitution | 0.93, falling above 2.5 m/s | Estimate, from pool. Match-table cushions are often heated and may be livelier |
| Cushion friction | 0.14 | Estimate, from pool |
| Cushion contact height | 1.27 R | Estimate, from pool (WPA nose height) |

No value here has been calibrated against a real three-cushion table, so long routes round several cushions should be taken as approximate.

## Cue

The pool cue. Maximum cue speed 9 m/s. Side spin matters more than in the potting games, because it changes each rebound angle.

## Scoring from physics

`scanCannon` walks the striker's events, counting cushions until its second different ball. A bounce off either cushion in a corner counts separately.

## Two cue balls

As in [English Billiards](../billiards/physics.md), `white` and `yellow` trade positions when the turn passes.
