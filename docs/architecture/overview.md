# Architecture overview

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 and three.js. There is no backend: everything runs in the browser and progress lives in `localStorage`.

## Layers

Dependencies point downwards only. The engine knows nothing about React or about any particular game.

```text
src/app/        Routes: home, /[game], practice, lessons, challenges, stats
src/ui/         Screens and controls, built on one shared session hook
src/views/      The table in 2D (canvas) and 3D (three.js), themes, table shapes
src/games/      One folder per game, plus the registry
src/workers/    The solver and coach, off the main thread
src/core/       Engine, rules interface, lessons, AI, progress, preferences
```

| Folder | Responsibility |
|---|---|
| `src/core/sim/` | The physics engine. See [physics](../physics/README.md) |
| `src/core/game.ts` | The `Game` interface every game implements |
| `src/core/rules.ts` | The `RulesEngine` interface: turn finished shots into scores and the next position |
| `src/core/lessons/` | Drills, challenges, the shot solver, verdicts and session stats |
| `src/core/ai/` | The potting coach and computer opponent |
| `src/core/progress/`, `src/core/prefs/` | Local storage, exposed as React external stores |
| `src/games/registry.ts` | The list of games and how they are grouped into families |

## What happens when you shoot

1. The screen calls `session.simulate`, which applies the game's striker placement and the player's table-speed setting and runs `game.simulate`.
2. The engine returns a finished `ShotResult`: every event, a snapshot after each one, and the final position.
3. `useShotPlayer` animates that result from its closed-form motion, firing sound and pocket effects as each event's time passes. React only re-renders at the start and end.
4. When it ends, `rules.judge` (or `game.afterShot` in free practice) gives the score and next position, and `session.celebrate` handles feedback.

Because the shot is fully worked out before it is drawn, the 2D view, the 3D view, replays and aiming guides all come from the same data and cannot disagree.

## Aiming guides

`src/views/2d/prediction.ts` runs the real engine on a scratch copy of the table every time the aim changes. Lines bend round cushions because they are the ball's actual path. "Extend the lines" divides the cloth friction, which keeps the shape of a path and only changes how far along it the ball gets.

## Worth knowing

- **Two views, one input.** `TableCanvas` and `TableCanvas3D` take the same props, and `TableView` chooses between them. Table shapes shared by both are in `src/views/jaws.ts`.
- **Frames bypass React.** Per-frame drawing goes through `paintRef`, never through state.
- **Heavy search runs in a worker.** The solver and coach go through `useAdvisor`, with a main-thread fallback and a timeout.
- **Next.js has changed.** `AGENTS.md` asks you to read `node_modules/next/dist/docs/` before writing Next code. Route `params` are Promises, read inside a `<Suspense>` child.

## Related

- [Adding a game](adding-a-game.md)
- [Lessons and challenges](lessons-and-challenges.md)
- [UI and theming](ui-and-theming.md)
