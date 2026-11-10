# 8-Ball Pool

Physics: [physics.md](physics.md). Code: `src/games/pool/`.

## Rules implemented

`rules.ts`.

- The table is open until a player legally pots a ball, which decides who has solids and who has stripes.
- You must hit one of your own group first. Hitting the 8 first is a foul until your group is cleared.
- After contact, a ball must be potted or some ball must reach a cushion.
- A foul gives the opponent ball in hand.
- Potting the 8 wins only if your group was already cleared and the shot was legal. Potting it otherwise loses the frame.

## Content

Video lesson, potting drills, a cue-ball control module, and nine challenges.
