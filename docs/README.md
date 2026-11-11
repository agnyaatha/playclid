# Table Craft documentation

| Folder | What is in it |
|---|---|
| [architecture/](architecture/overview.md) | How the code is layered, how lessons and challenges work, the UI and theming, and how to add a game |
| [physics/](physics/README.md) | The shared engine: motion, collisions, the event loop, tables, strikes and how it is verified |
| [games/](games/README.md) | One folder per game, each with its rules (`README.md`) and physics (`physics.md`) |
| [development/](development/checks.md) | The pre-commit production checks, [deploying and search](development/deploy-and-seo.md), and [usage analytics](development/analytics.md) |
| [research/](research/snooker-app-design.md) | The original research notes the project was built from |

## Keeping these accurate

Each game's numbers live in its source files, and the pages here name those files. Change a parameter and update that game's `physics.md` in the same commit. `src/docs.test.ts` fails if a registered game has no docs or if a relative link in these pages is broken.
