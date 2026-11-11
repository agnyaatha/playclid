# Lessons and challenges

Code is in `src/core/lessons/`, with content in each game's folder.

## Lesson kinds

| Kind | What it is | Screen |
|---|---|---|
| `watch` | Written notes with animated examples, then links to videos opened on YouTube | `WatchLessonView` |
| `drill` | A set position repeated over practice and test attempts | `DrillPlayer` |
| `break` | One scored visit to the table | `BreakPlayer` |

## Notes and animated examples

A `watch` lesson's `notes` are its written lesson, shown before the videos. Each `NoteSection` has a heading, paragraphs (`body`), optional key `points`, and an optional `demo`.

A `Demo` is a small table that plays itself, using the same engine as practice (`ShotDemo`). It shows the aim with the ghost ball, plays the shot, holds the result, and repeats while it is on screen. With reduced motion turned on it waits for the Play button. Leave out `shot` for a still picture of a layout; `layoutOf(game.createInitialBodies(table))` gives a game's opening position. Videos are optional when the notes stand alone. When an aim needs to be exact, the drill solver (`findSolution`) is a quick way to find a shot that works, and `{ deg }` records it.

| Field | Meaning |
|---|---|
| `layout` | Balls by coordinates or named spot, as in a drill |
| `shot.aim` | `{ pot, pocket }` aims at the ghost ball for that pot; `{ at }` hits a ball full; `{ toward }` aims at a point; `{ deg }` is a fixed direction (90 is up the table) |
| `shot.power`, `shot.spin` | Fraction of the game's top speed; tip offset in fractions of the radius (y above centre, x right) |
| `showPath` | Also draw the predicted paths and angle marks before the shot |
| `zone` | A target circle, e.g. where the cue ball should finish |
| `misses` | The shot is meant to miss its pot, to show an error |
| `pots` | Balls the shot must pot, when the aim is not a `pot` aim |
| `strikerPots` | The striker is meant to drop (an in-off in billiards, the 20 hole in crokinole) |
| `cannon` | The striker must hit both other balls, with at least this many cushions before the second |

Because the animations run the real physics, a change to the engine could quietly make a caption untrue. `src/games/notes.test.ts` plays every demo and checks what it claims: a `pot` aim must pot (or miss, with `misses`), the balls in `pots` must drop, a `cannon` must be made, the striker must not drop unless `strikerPots` says so, and the stun, screw and top demos must do what they say. Every game's curriculum opens with one of these lessons. When a physics change breaks one, retune the demo's power or spin rather than the caption. A throwaway test that prints where the cue ball finishes makes this quick. `validateLesson` also checks every demo layout for overlaps, positions off the table, and unknown balls or pockets.

## Drills

A drill lists its success criteria in `SuccessCriteria`. Every condition given must hold.

| Criterion | Meaning |
|---|---|
| `pot` | A ball must be potted, optionally only in named pockets |
| `zone` | The striker must finish inside a circle |
| `cannon` | The striker must hit both other balls, with at least N cushions before the second |
| `inOff` | The striker must go in a pocket after hitting a ball |

Aids fade one at a time across the practice attempts, and test attempts have none (`aidsForAttempt`).

## The solver

`findSolution` in `solver.ts` proves a drill can be done, and powers "Watch how it's done".

- A pot is searched by aiming at the ghost ball for each allowed pocket, then varying aim, power and tip.
- A cannon, a zone, or the striker into a hole has no ball to line up, so `sweepSolution` sweeps the aim and pace instead.

Every drill in every game is run through the solver in the tests.

## Walkthrough

`useShotDemo` animates a solved shot on the real table: sweep the aim, wind up the power, then play it at 0.6× speed. It runs once per drill automatically, scores nothing, and restores the controls.

## Challenges

`challenges.ts` builds nine per potting game across three tiers, from fixed seeds. A layout is only accepted if every target has a clear line from the striker and on into a pocket at a cut no thinner than 60°. Tests also prove the first target can really be potted.

Balls stay where they stop between shots. Stars come from `challengeStars`: three for one shot per target.

## Shot feedback

`insight.ts` provides the verdict after a shot, great-shot detection (long pots and doubles), break milestones, and session statistics.
