# 9-Ball physics

Shared behaviour: [physics engine](../../physics/README.md).

9-Ball is played on the [8-ball pool table, with the same balls, parameters and cue](../pool/physics.md). The `nineball` game spreads the `pool` game object and replaces only the name, rules and rack, so a change to pool's physics applies here too.

| Difference | Value |
|---|---|
| Balls | The 1 to the 9, plus the cue ball |
| Rack | A diamond of rows 1-2-3-2-1 with its front on the foot spot: the 1 at the front and the 9 in the middle |
| Rack gap | 0.5 mm between balls, so none start in contact |

## The break

The small rack gap is a modelling choice. Real racks are tight, and how the pack opens up is sensitive to it.
