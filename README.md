# Table Craft

Learn eight table games on a real physics engine: guided drills that fade the aiming aids as you improve, scattered-table challenges, and full rules against a friend or the computer. Runs entirely in the browser, and progress stays on the device.

| Family | Games |
|---|---|
| Snooker and billiards | Snooker, English Billiards, Three-Cushion |
| Pool | 8-Ball Pool, 9-Ball |
| Disc and board games | Carrom, Crokinole, Shuffleboard |

## Getting started

```bash
npm install   # also enables the pre-commit checks
npm run dev   # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit, rules and physics tests |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run check` | Everything the pre-commit hook runs, over all tracked files |

## Documentation

Start at [docs/README.md](docs/README.md). The most used pages:

- [How the code fits together](docs/architecture/overview.md)
- [How the physics works](docs/physics/README.md)
- [Each game's rules and physics](docs/games/README.md)
- [Adding a new game](docs/architecture/adding-a-game.md)
- [Pre-commit checks](docs/development/checks.md)
