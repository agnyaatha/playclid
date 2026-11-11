# Strikes

How a shot puts a ball in motion. Each game's `simulate` applies one of these, then calls the engine.

## Cue strike

`src/games/snooker/strike.ts`, used by all five cue games. A level-cue strike delivers an impulse along the aim line, at offset `(a, b)` from the ball's centre:

```text
J = (1 + e)·V / ( 1/m + 1/M + (a² + b²)/I )
```

| Symbol | Meaning |
|---|---|
| `V` | Cue speed at impact |
| `e` | Tip restitution |
| `M`, `m` | Cue and ball mass |
| `I` | `0.4·m·R²` |

Consequences:

- Ball speed is `J/m`, so **off-centre hits are weaker**.
- Vertical offset `b` gives topspin or backspin (follow or draw).
- Horizontal offset `a` gives sidespin.
- Offsets are clamped to `maxOffset`, 0.5 of the radius, past which a miscue is likely.

**Squirt:** sidespin deflects the ball away from the struck side by `squirtPerOffset × offset`. It is linear in the offset and does not depend on speed, as Alciatore measured. Both cues use `STANDARD_SQUIRT`, 2.5° at half a radius of side, his figure for a standard shaft. A low-deflection shaft would be about 1.8° (0.063 rad per unit of offset).

Not modelled: an elevated cue, so there is no swerve from cue elevation and no massé.

## Flick

`flickSimulate` in `src/games/shared.ts`, used by carrom, crokinole and shuffleboard. The disc leaves at the given speed with no spin of its own, in the rolling state. Because these games set sliding and rolling friction equal, it slows at a constant rate.
