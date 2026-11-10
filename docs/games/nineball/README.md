# 9-Ball

Physics: [physics.md](physics.md). Code: `src/games/nineball/`.

## Rules implemented

`rules.ts`.

- The lowest numbered ball on the table must be hit first.
- Any ball potted after that legal contact counts, and you play on.
- Legally potting the 9 wins immediately, including by combination.
- After contact, a ball must be potted or some ball must reach a cushion.
- A foul gives the opponent ball in hand. If the 9 went down on a foul, it is spotted again.

## Simplified from the full game

There is no push-out, no three-foul rule and no break requirements.

## Content

Four drills and nine challenges in `content.ts`.
