# Pre-commit checks

`.githooks/pre-commit` runs `scripts/precommit.mjs` before every commit, and `.githooks/commit-msg` runs `scripts/commit-lint.mjs` on the message (see [commit messages](../../CONTRIBUTING.md#commit-messages)). Both hook files must stay executable. `npm install` enables the hook through the `prepare` script, which sets `core.hooksPath`. The script is plain Node, so it behaves the same on Windows, macOS and Linux.

## What runs, in order

| Step | Fails on |
|---|---|
| Staged paths | `.env` files, private keys, or generated output such as `.next/` and `node_modules/` |
| Staged size | Any file over 1 MB |
| Staged encoding | Any text file that is not valid UTF-8 |
| Added lines | Tokens, API keys, private keys and hard-coded credentials |
| Added lines | Merge conflict markers, `.only(` in tests, and `debugger` statements |
| Typecheck | `tsc --noEmit` |
| Lint | ESLint, with warnings treated as errors |
| Tests | Unit, rules, physics and documentation tests |
| Production build | `next build` |

File checks come first because they finish in under a second. The first failing step stops the run and prints its output.

## Commands

```bash
npm run check   # every step, over all tracked files
```

## Good to know

- Secrets and leftovers are only looked for in lines being added, so old history does not block new work. `npm run check` scans whole files instead.
- Stop a running dev server if the build step reports that the build directory is in use.
- The test suite includes the 400-shot physics stress test for every game, so a physics change that breaks an invariant is caught here.
