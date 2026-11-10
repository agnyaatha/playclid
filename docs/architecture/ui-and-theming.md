# UI and theming

## Screens

`useTableSession` (`src/ui/useTableSession.ts`) holds what every table screen shares: position, controls, playback, aim preview, pull-back shooting and feedback. `PracticeTable`, `DrillPlayer`, `BreakPlayer` and `ChallengePlayer` only add what is different around a shot.

Floating over the table: `TableOverlay` (effects, power meter), `TableBanner` (fouls, computer's turn) and `TableTools` (settings, keyboard help, first-run tour).

## Effects

`src/ui/fx/` has three parts:

| File | Job |
|---|---|
| `bus.ts` | Hands one-off effects to the overlay without re-rendering the screen. Decorative ones respect the Celebrations setting and reduced-motion |
| `sound.ts` | Table sounds synthesised with Web Audio, so there are no audio files |
| `FxLayer.tsx` | Draws glows, floating points, toasts, verdicts and confetti |

## Motion

Interface animation uses game elements and is CSS wherever possible (`src/app/globals.css`). Everything respects the device's reduced-motion setting.

| Where | What | Code |
|---|---|---|
| Loading screens | A cue striking a ball into a pocket, or a striker and coin on a board, chosen by game | `TableLoader`, `RouteLoader` |
| Button presses | A ripple from the press point. Shoot adds a cue strike and chalk dust, without the cue on disc games | `ButtonEffects`, one listener for the whole app |
| Tabs and switches | The highlight rolls to the chosen option with a small ball under it | `Segmented` |
| Checkboxes | A ball rolling along a rail | `globals.css` |
| Waiting | A Newton's cradle | `Thinking` |
| Progress | A ball along the goal bar, balls that drop as challenge shots are used | `ActivityCard`, `ChallengePlayer` |
| Page changes | The page eases in as a ball rolls under the header | `src/app/template.tsx` |

## Themes

A theme has two halves:

- **App colours:** a `[data-theme="..."]` block of CSS variables in `src/app/globals.css`. The default theme is `:root`.
- **Table materials:** an entry in `THEMES` in `src/views/appearance.ts`, applied by `styleTable`. It caches its result because the table views rebuild when handed a new object.

To add one, add both halves. A test checks that its text and accent colours meet contrast thresholds. An inline script in `layout.tsx` applies the saved theme before first paint.

The variable names `--brass` and `--ivory` are historic: `--brass` is the accent and `--ivory` the main text colour, in every theme. `--chalk` is the one that stays ivory, for balls and slider thumbs.

## Fonts

Barlow Condensed for headings and scores (`.display`) and Barlow for body text, loaded through `next/font` in `layout.tsx`.

## Preferences

`usePref` reads from `prefsStore`, one JSON object in `localStorage` under `sim-pool:prefs`. Always pass a validator for structured values, so data from an older version falls back safely.
