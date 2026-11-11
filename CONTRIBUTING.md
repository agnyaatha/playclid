# Contributing to PlayClid

Thank you for helping. This page covers what to work on and how changes get in. For setting up and working on the code, see the [developer guide](docs/development/getting-started.md).

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to help

| Kind | Examples | Where to start |
|---|---|---|
| Report a bug | A crash, a wrong score, a ball through a cushion | Open a **Bug report** issue |
| Physics accuracy | "A stun shot at this angle goes too wide", "pool cushions are too lively" | Open a **Physics accuracy** issue. Video, measurements or a published source help most |
| Content | New drills, lessons and challenges | [Lessons and challenges](docs/architecture/lessons-and-challenges.md). This is plain data, a good first contribution |
| A new game | Bagatelle, Russian pyramid, pocket billiards variants | [Adding a game](docs/architecture/adding-a-game.md). Open an issue first to agree the scope |
| Docs and translations | Clearer explanations, fixing a stale number | Any page in [docs/](docs/README.md) |
| Accessibility and mobile | Keyboard play, screen readers, small screens | Open an issue describing who is affected |

Issues labelled `good first issue` are small and well described. Comment on one to say you are taking it, so two people don't do the same work.

## Before you start

- **Small fixes** (typos, an obvious bug, a test): just open a pull request.
- **Anything larger** (a new feature, a physics model change, a new game, a new dependency): open an issue first and describe the approach. Agreeing on it up front saves rework.
- **Physics changes** need evidence. Say what real behaviour the change matches and where that comes from: Dr. Dave Alciatore's technical proofs, Mathavan et al., pooltool, measured video, or the rules of the sport.

## Pull requests

1. Fork the repository and branch from `master`.
2. Make the change, with tests and docs (see below).
3. Run `npm run check`. It must pass; CI runs the same checks.
4. Open the pull request with a title in the [commit format](#commit-messages), and fill in the template. For anything visible, include a screenshot or a short clip, at phone width as well as desktop if the layout changed.
5. Keep each pull request to one concern. Two unrelated fixes are easier to review as two.

A maintainer will review it, usually within a week. Expect questions: they are part of getting it right, not a rejection. Once approved and green, it is squash-merged, so the pull request title becomes the single commit on `master`.

### Checks on every pull request

| Check | What it does |
|---|---|
| **CI** | `npm run check`: files, typecheck, lint, tests and a production build |
| **PR title** | The title follows the [commit format](#commit-messages) |
| **CodeQL** | GitHub's security scan of the code and the workflows |
| **Dependency review** | Fails if the change adds a dependency with a known vulnerability or an incompatible licence |

`master` is protected: changes arrive through pull requests with CI and the title check passing, history stays linear, and the branch cannot be force-pushed or deleted.

### What a pull request needs

- **Tests.** New behaviour has a test that fails without the change. Rules have tests in each game's folder, and physics in `src/core/sim/*.test.ts`. Every drill and challenge is automatically checked for a passing shot.
- **Docs.** If you change behaviour or a parameter, update the page that describes it in the same pull request. Each game's numbers are listed in `docs/games/<game>/physics.md`.
- **No new dependencies** without discussion. The engine has none, and the bundle stays small for phones.
- **Accessible UI.** Buttons are real `<button>` elements with labels, colours come from the theme tokens, and anything you can do with a mouse you can do with a keyboard.

## Style

The linter and type checker enforce most things. Beyond them:

- **TypeScript, strict.** No `any` without a comment explaining why.
- **Comments say why, not what.** A short doc comment on each exported function, saying what it is for and any non-obvious unit or assumption. Units are SI throughout: metres, seconds, kilograms, radians.
- **Keep the layers.** `src/core/` must not import React UI or a specific game; `src/core/sim/` must not import anything outside itself. See the [architecture overview](docs/architecture/overview.md).
- **Plain English in the UI and docs.** Short sentences. Explain a billiards term the first time it appears.

## Commit messages

Commits and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org):

```text
type(scope): subject

Body: what changed and why, wrapped at about 72 characters.

Fixes #123
```

- **type** says what kind of change it is (below).
- **scope** is optional: the game or area, such as `snooker`, `carrom`, `physics`, `lessons`, `3d`, `ui`, `analytics`, `seo` or `deps`.
- **subject** is a command in lower case with no full stop, under 72 characters for the whole line: `fix(physics): stop the cue ball sticking to the cushion`, not `Fixed cushion bug.`
- Add `!` after the type or scope for a change that breaks saved progress, settings or links: `feat(lessons)!: renumber the snooker modules`.

| Type | Use for |
|---|---|
| `feat` | A new feature players or contributors can see |
| `fix` | A bug fix |
| `physics` | A change to the simulation or a game's physical parameters |
| `content` | Lessons, drills, challenges or their notes |
| `perf` | Faster or lighter, with no change in behaviour |
| `refactor` | Restructured code, no change in behaviour |
| `docs` | Documentation only |
| `test` | Tests only |
| `style` | Formatting only |
| `build` | Dependencies, the build or tooling |
| `ci` | GitHub workflows and repository configuration |
| `chore` | Anything else that does not touch the app |
| `revert` | Undoing an earlier commit |

`npm install` sets git up to open the template in `.gitmessage` when you commit, and a `commit-msg` hook checks the format before the commit is made. Git's own messages (merges, reverts, `fixup!`) are let through. The rules live in `scripts/commit-lint.mjs`.

## Licence of contributions

PlayClid is [MIT licensed](LICENSE). By submitting a pull request you agree that your contribution is licensed under the same terms, and that you have the right to submit it. Do not paste code, images or text from sources whose licence does not allow it.

## Getting help

If you are stuck, open a draft pull request or an issue and ask. Questions are welcome, including beginner ones.
