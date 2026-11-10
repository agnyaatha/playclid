# Lessons and challenges

Code is in `src/core/lessons/`, with content in each game's folder.

## Lesson kinds

| Kind | What it is | Screen |
|---|---|---|
| `watch` | Links to videos, opened on YouTube | `WatchLessonView` |
| `drill` | A set position repeated over practice and test attempts | `DrillPlayer` |
| `break` | One scored visit to the table | `BreakPlayer` |

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
