# Snooker

Physics: [physics.md](physics.md). Code: `src/games/snooker/`.

## Rules implemented

`rules.ts`, with `snookered.ts` for the free-ball check.

- Reds and colours alternate while reds remain. Colours are respotted during this phase.
- After the last red and its colour, the colours are cleared in order: yellow, green, brown, blue, pink, black.
- A foul costs at least 4, or the value of the highest ball involved, to a maximum of 7.
- If the last red goes down in a foul, the clearance starts on the yellow.
- **Free ball:** after a foul that leaves the next player snookered. Only balls that are not on count as blocking. With reds on, the free ball must be a colour.
- **Foul and a miss:** when no ball on was hit, the next player can ask for the shot to be replayed from the original position. The foul points stand.
- Level scores after the black: it is respotted, and the next pot or foul decides the frame.

## Content

Lessons in `lessons/`: reading modules from the beginner curriculum (`watch.ts`, with their written notes and animated examples in `notes.ts`), drills (`drills.ts`) and break drills (`breaks.ts`), plus nine challenges (`challenges.ts`).
