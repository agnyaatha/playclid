# Carrom physics

Shared behaviour: [physics engine](../../physics/README.md). Code: `table.ts`, `layout.ts`, `index.ts` in `src/games/carrom/`.

## Board and pieces

| Quantity | Value | Status |
|---|---|---|
| Playing area | 0.74 × 0.74 m | Standard |
| Coin radius | 15.75 mm | Standard |
| Coin mass | 5.5 g | Standard |
| Striker radius | 20.5 mm | Standard |
| Striker mass | 15 g | Standard |
| Pocket mouth | 46 mm, in the four corners | Estimate |
| Baseline | Striker centre 74.5 mm from the near cushion | Estimate |
| Baseline travel | ±0.22 m from the middle | Estimate |

## Parameters

`CARROM_PARAMS`. All are estimates.

| Parameter | Value | Notes |
|---|---|---|
| Sliding friction | 0.12 | Set equal to rolling on purpose |
| Rolling friction | 0.12 | |
| Spin friction | 0.05 | |
| Coin-coin restitution | 0.9 | |
| Coin-coin friction | 0.03 | Powdered surfaces |
| Cushion model | Impulse | |
| Cushion restitution | 0.7 | |
| Cushion friction | 0.1 | |
| Contact height | 1 R | At the disc's centre height |

## Modelling a sliding disc

A coin never rolls. The engine's states are built for balls, so a disc is launched in the `rolling` state with sliding and rolling friction equal. It then slows at a constant rate whichever state it is in, which is what a sliding disc does.

Collision inertia uses the sphere formula, an approximation for a flat disc. See [collisions](../../physics/collisions.md).

## Strike

A [flick](../../physics/strikes.md): no spin. Maximum speed 4.5 m/s. The striker's position on the baseline uses the same control as cue-game side spin.

## Limits

The real game's powder condition is not modelled, except through the Table speed slider.
