# Physics engine

One engine in `src/core/sim/` runs all eight games. It is pure TypeScript with no dependency on React or the renderers. Each game supplies its table, bodies and parameters.

| Page | Covers |
|---|---|
| [Motion](motion.md) | Sliding, rolling and spinning, in closed form |
| [Collisions](collisions.md) | Ball-to-ball, and the two cushion models |
| [Event loop](event-loop.md) | How the next event is found, and caching |
| [Tables and pockets](tables-and-pockets.md) | Cushions, jaws, pegs, holes and drop-off edges |
| [Strikes](strikes.md) | The cue strike, and flicked discs |
| [Verification](verification.md) | What is tested, what is calibrated, what is an estimate |

Game-specific numbers are in each [game's physics page](../games/README.md).

## Conventions

- **Units** are SI: metres, seconds, kilograms.
- **Table axes:** `x` across the width, `y` along the length, origin at a corner. `z` is up.
- **Aim** is in radians with direction `(cos, sin)` in table `x`-`y`, so `π/2` points straight up the table.
- **Simulation is deterministic.** The same input gives the same result, with ties between events broken by a fixed order.

## Parameters

`SimParams` in `params.ts`:

| Field | Meaning |
|---|---|
| `cloth.muSliding` | Sliding friction, ball on cloth |
| `cloth.muRolling` | Rolling resistance |
| `cloth.muSpinning` | Spin friction about the vertical axis |
| `cloth.g` | Gravity, 9.81 m/s² |
| `ballBall.restitution` | Bounciness of ball-to-ball contact |
| `ballBall.friction` | Surface friction between balls, which causes throw |
| `cushion.restitution` | See the warning below |
| `cushion.friction` | Friction at the cushion |
| `cushion.contactHeight` | Contact height as a multiple of ball radius |
| `cushion.model` | `"mathavan"` or `"impulse"` |

> **`cushion.restitution` is not the rebound ratio** under the Mathavan model. It is the energetic coefficient of the impact, and the visible rebound comes out lower. See [collisions](collisions.md).

`scaleCloth(params, k)` multiplies sliding and rolling friction by `k`. It powers both the Table speed setting and "Extend the lines".
