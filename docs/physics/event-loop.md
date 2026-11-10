# Event loop

`src/core/sim/simulate.ts`, with root finding in `poly.ts`.

## Idea

The engine does not step time forward. Between events every ball follows a known quadratic, so the time of the next event can be solved exactly and the loop jumps straight to it. A slow rolling ball and a fast break are equally accurate, and there is no tunnelling.

## What is solved

With position `p(t) = p₀ + v·t + ½a·t²`:

| Event | Equation | Degree |
|---|---|---|
| State change | Closed form in [motion](motion.md) | 1 |
| Cushion | Distance from the cushion line equals the radius | 2 |
| Pocket mouth | Centre crosses the jaw line | 2 |
| Pocket circle, jaw tip | Distance from a point equals a radius | 4 |
| Two balls | Distance between centres equals the sum of radii | 4 |

`firstApproach` returns the earliest time the quantity reaches zero while closing. A cushion or mouth only counts if the contact falls within that segment.

## Scheduling

Predicted times are **absolute and cached**:

- `transAt[i]`: this ball's next state change
- `rail[i]`: this ball's next cushion, jaw or pocket
- `pairAt[i,j]`: the next contact for this pair

An event only changes the path of the one or two balls involved, so only their predictions are recomputed. That is O(n) root solves per event instead of O(n²). A pair whose gap exceeds the most it could close in the window is skipped without solving.

Simultaneous events are ordered: pocket, collision, cushion or jaw, then state change, then by index. That keeps results deterministic.

## Limits

| Option | Default | Purpose |
|---|---|---|
| `maxTime` | 120 s | Simulated time cap |
| `maxEvents` | 30000 | Safety cap on cascades |
| `stopWhen` | none | Stop after a matching event, used by the aim preview |
| `params` | the game's | Replace the physics for one run |

If a cap cuts a shot short, the remaining balls are settled to rest, so the next shot still has a valid position.

## Output and replay

A `ShotResult` holds the starting bodies, every event, a snapshot after each event, the duration and the final bodies. `stateAt` in `playback.ts` finds the last event before a time and evolves from its snapshot, so replay is exact and independent of frame rate.
