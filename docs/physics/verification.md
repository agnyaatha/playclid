# Verification

## Automated

| Test file | What it proves |
|---|---|
| `src/core/sim/fuzz.test.ts` | 400 random shots per game, carrying on from each position. No ball leaves the table, overlaps, gains energy or fails to stop, and event counts stay low |
| `src/core/sim/simulate.test.ts` | Motion, ball collisions, and cushion behaviour: throw against speed and spin, rebound range, the rigid limit and the falloff past it, spin effects and symmetry |
| `src/core/sim/calibration.test.ts` | Table speed scaling reaches every game |
| `src/core/lessons/lessons.test.ts`, `src/games/*.test.ts` | Every drill is valid and has a shot that passes it, and each game's rules behave |
| `src/core/lessons/challenges.test.ts` | Every challenge has a sound layout and an opening pot |

## How far each number can be trusted

| Status | Meaning | Examples |
|---|---|---|
| **Measured** | Published measurements | Snooker sliding and rolling friction, ball mass, contact height |
| **Calibrated** | Tuned here to match a measurement | Snooker cushion `e` = 0.88, matched to the measured 0.818 rebound |
| **Standard** | From the rules of the sport | Table sizes, ball sizes |
| **Estimate** | A reasonable value, not measured | Pool cushion `e` = 0.93, the cushion falloff above 2.5 m/s, all Three-Cushion, carrom, crokinole and shuffleboard friction and restitution |

Each game's physics page marks its own values. None of the games has been compared against video of real play. The Table speed slider exists so a player can match their own cloth.

## Known limits

- The cue is always level, so there is no massé or swerve from elevation.
- Balls never leave the table surface. There are no jumps or airborne balls.
- Disc games use sphere inertia. See [collisions](collisions.md).
- Under the Mathavan model, cushion contact is treated as rigid. The source paper notes this holds below about 2.5 m/s normal speed.
