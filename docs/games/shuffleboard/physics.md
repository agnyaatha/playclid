# Shuffleboard physics

Shared behaviour: [physics engine](../../physics/README.md). Code: `src/games/shuffleboard/index.ts`.

## Table and pucks

| Quantity | Value | Status |
|---|---|---|
| Playing length | 3.66 m (12 ft) | Standard short table |
| Width | 0.5 m | Standard |
| Puck radius | 29 mm | Estimate |
| Puck mass | 330 g | Estimate |
| Start line | Pucks start 0.3 m from the near end | Estimate |
| Placement travel | ±0.17 m across the table | Estimate |

## The far edge

The whole far edge is one [drop-off pocket](../../physics/tables-and-pockets.md) across the full width. A puck whose centre crosses it has gone over and cannot come back. The 50 mm gutter beyond is only drawn.

An earlier version used a dead cushion at the end. With a very low restitution, pucks pinned against a rail produced thousands of tiny bounces, which the stress test caught. The drop-off line let the side rails go back to a normal bounce.

## Parameters

`PARAMS`. All are estimates.

| Parameter | Value | Notes |
|---|---|---|
| Sliding and rolling friction | 0.11 | Waxed wood |
| Spin friction | 0.05 | |
| Puck-puck restitution | 0.85 | |
| Puck-puck friction | 0.03 | |
| Cushion model | Impulse | Side rails and the near end |
| Cushion restitution | 0.45 | |
| Cushion friction | 0 | Rail friction also fed the rail chatter |
| Contact height | 1 R | |

## Strike

A [flick](../../physics/strikes.md), maximum speed 4.2 m/s. Reaching the far zones takes about 2.7 m/s.

## Limits

- Real tables have open gutters along the sides. Here the sides are rails that give a modest bounce.
- Real shuffleboard tables have a slight lengthwise crown (cupping) and silicone-bead wax, neither of which is modelled.
- Pucks use [sphere inertia and the sliding-disc approach](../carrom/physics.md).
