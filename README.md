# Twig's Cook Book

A small, searchable recipe book. Each recipe has ingredients you can check off as you gather them and numbered steps you can mark done as you cook. Your progress is saved in the browser, so a reload doesn't lose your place. Each recipe has its own link (for example `#/instant-pot-lentil-stew`) that you can bookmark or share, and the "All recipes" link (`#/browse`) lists every recipe so you can open one without searching. On supported browsers, a "Keep screen on while cooking" option stops your phone from going to sleep mid-recipe.

**Live site:** <https://grfinch.github.io/recipes/>

Built with React 19 and Vite. It's a static site with no backend: each recipe is a JSON file in [`src/recipes/`](src/recipes/).

## Getting started

You need Node 26 (see [`.nvmrc`](.nvmrc)).

```bash
npm ci        # install exact dependency versions from package-lock.json
npm run dev   # start the dev server and open http://localhost:5173/recipes/
```

The app is served from `/recipes/`, not `/`, to match its GitHub Pages address.

`npm ci` also installs git hooks. Before each commit, they format and lint the files you're committing (and validate recipes if you changed one). Before each push, they run the same checks as CI, so a push can't fail CI on formatting or tests.

## Commands

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                  |
| `npm test`             | Unit tests (Vitest + React Testing Library) |
| `npm run test:watch`   | Unit tests, re-running on every change      |
| `npm run lint`         | ESLint, including accessibility rules       |
| `npm run format`       | Format every file with Prettier             |
| `npm run format:check` | Check formatting without changing files     |
| `npm run build`        | Production build to `dist/`                 |
| `npm run preview`      | Serve the production build locally          |

## Adding a recipe

Ask Claude Code to add it: the `add-recipe` skill drafts the recipe from pasted text or a few questions, shows it to you, then saves it as `src/recipes/<id>.json` and opens a pull request. To add one by hand, create `src/recipes/<id>.json` with the fields described under "Recipe schema" in [`AGENTS.md`](AGENTS.md#architecture), then run `npm run validate:recipes`.

## Continuous integration and deploys

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, the format check, the tests, and the build on every pull request and every push to `main`. A push to `main` deploys to GitHub Pages, but only if all of those pass.

Dependabot checks for dependency updates weekly. Patch and minor updates merge automatically once CI passes. Major updates wait for review. Auto-merged updates go live with the next push to `main`, because merges made by GitHub Actions don't start new workflow runs.

## Working with AI coding agents

[`AGENTS.md`](AGENTS.md) describes the architecture, conventions, and accessibility rules for AI coding agents. `CLAUDE.md` imports it for Claude Code. The `.claude/` folder has a lint-on-finish hook and a `run-recipes` skill that drives the app in a real browser.
