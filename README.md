# Twig's Cook Book

A small, searchable recipe book. Each recipe has ingredients you can check off as you gather them and numbered steps you can mark done as you cook. Your progress is saved in the browser, so a reload doesn't lose your place. Each recipe has its own link (for example `#/instant-pot-lentil-stew`) that you can bookmark or share.

**Live site:** <https://grfinch.github.io/recipes/>

Built with React 19 and Vite. It's a static site with no backend: all recipes live in [`src/recipes.json`](src/recipes.json).

## Getting started

You need Node 26 (see [`.nvmrc`](.nvmrc)).

```bash
npm ci        # install exact dependency versions from package-lock.json
npm run dev   # start the dev server and open http://localhost:5173/recipes/
```

The app is served from `/recipes/`, not `/`, to match its GitHub Pages address.

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

Add an object to the `recipes` array in `src/recipes.json`. The fields are described under "Recipe schema" in [`AGENTS.md`](AGENTS.md#architecture). Note that `ingredients` is a list of groups (an array of arrays), and the app draws a divider between groups.

## Continuous integration and deploys

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, the format check, the tests, and the build on every pull request and every push to `main`. A push to `main` deploys to GitHub Pages, but only if all of those pass.

Dependabot checks for dependency updates weekly. Patch and minor updates merge automatically once CI passes. Major updates wait for review. Auto-merged updates go live with the next push to `main`, because merges made by GitHub Actions don't start new workflow runs.

## Working with AI coding agents

[`AGENTS.md`](AGENTS.md) describes the architecture, conventions, and accessibility rules for AI coding agents. `CLAUDE.md` imports it for Claude Code. The `.claude/` folder has a lint-on-finish hook and a `run-recipes` skill that drives the app in a real browser.
