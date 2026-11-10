# Adding a game

The shared screens look games up by id, so a new game needs no UI work.

## Steps

1. **Add its id** to `GameId` in `src/core/game.ts`.
2. **Create `src/games/<id>/`** with:
   - a `Game` object: table, starting position, parameters, input scheme and `simulate`;
   - a `RulesEngine`, if it can be played as a frame;
   - a `GameTheme`, unless it reuses another game's table;
   - lessons, and challenges if it is a potting game.
3. **Register it** in `src/games/registry.ts`: an entry in `GAMES`, and its id in one of the `FAMILIES`.
4. **Document it** in `docs/games/<id>/README.md` and `docs/games/<id>/physics.md`. A test fails without them.
5. **Add it to the stress test** list in `src/core/sim/fuzz.test.ts`.
6. Run `npm run check`.

## Reusing what exists

| You want | Use |
|---|---|
| A variant on an existing table | Spread the existing game: `{ ...pool, id, name, rules }`. See `src/games/nineball/` |
| A cue game with its own constants | Call the other game's `simulate` with `opts.params`. See `src/games/threecushion/` |
| A flicked or pushed disc | `flickSimulate(params)` in `src/games/shared.ts` |
| One cue ball per player | `swapCueBalls` in `src/games/shared.ts` |
| A new disc on each shot | `retireStriker` in `src/games/shared.ts` |

## Options on `Game`

| Option | Use it when |
|---|---|
| `noPotting` | Pocketing is not the point. Hides the coach, computer opponent, potted-balls tray and session stats |
| `place` with `input.placement` | The striker slides along a line before the shot |
| `placeStriker` | Ball in hand is allowed |
| `resetStriker` | The striker returns to a start line after each shot |
| `afterShot` | Free practice needs something done after a shot, such as respotting a potted cue ball |

## Table shapes the engine supports

See [tables and pockets](../physics/tables-and-pockets.md) for pockets with jaws, pockets you drop into, drop-off edges, pegs, and round walls.
