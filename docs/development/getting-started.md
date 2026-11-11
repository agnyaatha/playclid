# Developer guide

Everything you need to go from a fresh clone to a merged pull request. For what to contribute and how reviews work, see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 1. Set up

### Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.9 or newer, 22 recommended | `.nvmrc` pins 22. With nvm, run `nvm use` in the repo |
| npm | Comes with Node | The lockfile is npm's; please do not add a yarn or pnpm lockfile |
| git | Any recent version | The pre-commit hook is a plain Node script, so it works on Windows, macOS and Linux |
| A browser with WebGL | Any current one | Only the 3D view needs WebGL. Without it the app falls back to 2D by itself |

No database, API keys or accounts are needed. The app has no backend.

### Install and run

```bash
git clone https://github.com/agnyaatha/sim-pool.git
cd sim-pool
npm install
npm run dev
```

Open <http://localhost:3000>. Pages reload as you save.

`npm install` also runs `scripts/install-hooks.mjs`, which points git at `.githooks/`, so the [pre-commit checks](checks.md) run before every commit. If you cloned without running `npm install`, run `npm run prepare` to turn them on.

### Environment variables

None are needed for development. A few optional ones switch on production features (analytics, the canonical site address, Search Console verification, a privacy contact). They are listed in [deploying and search](deploy-and-seo.md#environment-variables). For local testing, put them in `.env.local`, which git ignores and the pre-commit checks refuse to commit.

## 2. Commands

| Command | What it does | Typical time |
|---|---|---|
| `npm run dev` | Development server with hot reload | Starts in about 2 s |
| `npm test` | Every test, once | About 2 s |
| `npx vitest` | Tests in watch mode, re-running what your change affects | |
| `npm run typecheck` | Generates Next's route types, then runs `tsc` | About 2 s |
| `npm run lint` | ESLint | About 3 s |
| `npm run build` | Production build | About 5–10 s |
| `npm start` | Serves the production build on port 3000 (run `npm run build` first) | |
| `npm run check` | Everything the pre-commit hook runs, over all tracked files. CI runs this too | About 10 s |

Useful test filters:

```bash
npx vitest run src/core/sim               # one folder
npx vitest run src/games/snooker/rules    # one file (any part of the path)
npx vitest run -t "throw"                 # tests whose name matches
```

## 3. Find your way around

```text
src/
  app/          Next.js routes: home, /[game] hub, practice, lessons, challenges, stats, privacy,
                plus metadata (sitemap, robots, link-preview images, manifest)
  core/         Framework-free logic
    sim/        The physics engine: motion, collisions, the event loop, playback
    lessons/    Drills, challenges, the shot solver, verdicts, session stats
    ai/         The coach and computer opponent
    progress/   Lesson progress in localStorage
    prefs/      Viewer preferences in localStorage
    analytics/  Usage events (only with consent)
    game.ts     The Game interface every game implements
    rules.ts    The RulesEngine interface
  games/        One folder per game (table, layout, parameters, rules, lessons) and registry.ts
  views/        The table drawn in 2D (canvas) and 3D (three.js)
  ui/           Screens, controls, effects, the consent banner, the footer
  workers/      The solver and coach, off the main thread
docs/           Architecture, physics, per-game pages, development guides
scripts/        The pre-commit checks and hook installer
public/         Static files: the icon and the offline service worker
```

Dependencies only point downwards, from `app` to `ui` to `views` and `games`, down to `core`. The engine in `core/sim/` knows nothing about React or any particular game. Read the [architecture overview](../architecture/overview.md) before a larger change. It explains how a shot flows from the controls through the engine to the animation, and why the 2D view, the 3D view and the aiming guides always agree.

## 4. Common tasks

| I want to… | Read | Main files |
|---|---|---|
| Fix or tune the physics | [Physics engine](../physics/README.md), [verification](../physics/verification.md) | `src/core/sim/`, `src/games/<game>/params.ts` |
| Change a game's rules or scoring | That game's `docs/games/<game>/README.md` | `src/games/<game>/rules.ts` and its tests |
| Add a lesson, drill or challenge | [Lessons and challenges](../architecture/lessons-and-challenges.md) | `src/games/<game>/lessons/`, `src/games/<game>/challenges.ts` |
| Add a whole game | [Adding a game](../architecture/adding-a-game.md) | A new `src/games/<game>/` folder and `src/games/registry.ts` |
| Change how something looks | [UI and theming](../architecture/ui-and-theming.md) | `src/ui/`, `src/views/`, `src/app/globals.css` |
| Track a new usage event | [Analytics](analytics.md) | `src/core/analytics/track.ts` |
| Improve search or link previews | [Deploying and search](deploy-and-seo.md) | `src/core/site.ts`, `src/app/` metadata files |

### Working on the physics

The engine is event-based. Between events every ball follows an exact closed-form path, and the loop jumps from one collision, cushion hit, pot or state change to the next. A few rules keep it trustworthy:

- **Every parameter has a source.** When you change a value in a `params.ts`, update that game's `physics.md` in the same change. Say whether the value is measured, calibrated, standard or an estimate, and give the source.
- **Test against the real game.** `src/core/sim/simulate.test.ts` checks the engine against known shots: the 90° and 30° rules, the stop shot, throw against speed, cushion rebound. Add a case like these for any behaviour you change.
- **The fuzz test guards the invariants.** `src/core/sim/fuzz.test.ts` plays 400 random shots per game. No ball may leave the table, overlap another, gain energy or fail to stop.
- **Keep it fast.** A full break must simulate well inside one frame. The aiming guide re-runs the engine on every pointer move. `simulate.test.ts` has a performance guard.

To experiment, write a throwaway test that sets up balls with `reclassify({...})`, calls `simulateEvents` or `resolveBallBall` / `resolveCushion`, and prints what you want to see. The tests in `simulate.test.ts` are good templates. Delete it before committing.

### Working on the UI

- Frames are drawn through `paintRef` from the finished shot, never through React state. React only re-renders when a shot starts or stops.
- Both views take the same props. `TableView` chooses between `TableCanvas` (2D) and `TableCanvas3D`.
- Use the existing kit in `src/ui/kit/` (`Sheet`, `Toggle`, `Slider`, `Segmented`...) and the colour tokens in `globals.css`, so themes keep working.
- Check your change in a narrow window (about 390 px wide) as well as on desktop. Many players are on phones.

### Next.js is newer than you may know

This project uses Next.js 16 with Cache Components. Some APIs differ from older versions and from what AI assistants tend to suggest. `params` are Promises, read inside a `<Suspense>` child. Route segment options such as `export const dynamic` are not allowed. The documentation for the installed version is in `node_modules/next/dist/docs/`; check it before writing Next-specific code. [AGENTS.md](../../AGENTS.md) says the same for AI coding tools.

## 5. Make a change

1. **Open or find an issue** for anything larger than a small fix, so the approach can be agreed before you spend time on it.
2. **Branch** from `master`: `git switch -c fix/cushion-rebound`.
3. **Write the change and its tests.** Rules, physics and lesson content all have tests next to them. New behaviour needs a test that fails without it.
4. **Update the docs** that describe what you changed. `src/docs.test.ts` fails on broken links in the docs, and if a game has no docs pages.
5. **Run `npm run check`.** The pre-commit hook runs the same checks, and so does CI on your pull request.
6. **Commit** with a message that says what changed and why, in the imperative ("Fix squirt angle for low-deflection shafts").
7. **Open a pull request** and fill in the template. Screenshots or a short clip help with anything visible.

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find name 'LayoutProps'` or `PageProps` | These types are generated. `npm run typecheck` runs `next typegen` first; a bare `npx tsc` does not |
| The commit hook says the build directory is in use | Stop `npm run dev` or `npm start`, then commit again |
| Commit blocked: "environment file" or "possible API key" | Remove the file from the commit, or move the value to `.env.local`. Never commit real keys |
| 3D view shows 2D | The browser has no WebGL (common in VMs and some remote desktops). The fallback is deliberate |
| The app shows an old version after a deploy | The offline service worker serves cached pages. Reload once more, or clear the site data. It is only registered in production builds |
| Tests pass locally but CI fails | CI uses a clean `npm ci` on Node 22. Run `rm -rf node_modules && npm ci && npm run check` to match it |

## 7. Getting help

Ask in a GitHub issue or discussion: say what you tried and paste the error. For security problems, follow [SECURITY.md](../../SECURITY.md) instead of opening a public issue.
