# Tables and pockets

The `Table` type in `src/core/types.ts` describes what balls can interact with.

## Cushions

Straight `CushionSegment`s from `a` to `b`. A ball only bounces where its contact falls within the segment, so a ball can pass the end of a cushion into a pocket. The normal points towards the middle of the table.

A round wall is simply many short segments. Crokinole uses 72.

`mitre` is visual only. It means the cushion runs on into the next one, so the renderer joins them instead of rounding the ends.

## Jaw tips

`knuckles` are points balls bounce off, at the distance of the ball's radius. They stand in for the cushion tips at a pocket's jaws, so a ball can rattle off a jaw. Crokinole's pegs are the same thing.

## Pockets

| Kind | Set up with | Behaviour |
|---|---|---|
| Jaws | `mouth: { a, b }` | Potted as the ball's centre crosses the line between the tips, from the table side |
| Hole | No `mouth` | Potted when the centre enters the circle of `radius` |
| Speed-limited hole | `maxSpeed` | As a hole, but a ball faster than this skims over |
| Drop-off edge | Long `mouth`, `unmarked` | A whole table edge acting as one pocket. A puck that crosses it cannot bounce back |

`unmarked` tells the renderers to draw nothing, because the game's own markings show it. `drawRadius` sets the drawn size when it differs from the size that catches a ball.

## Drawn shape versus physics

Cushion noses sit exactly on the physics line. Their ends are rounded back towards the rail (`src/views/jaws.ts`), and pocket openings are pushed slightly outward so they bite into the rail. These are visual only. A ball still bounces off the original jaw tip, which sits just inside the rounded corner, so a ball glancing the very tip can look up to a few millimetres clear of it.
