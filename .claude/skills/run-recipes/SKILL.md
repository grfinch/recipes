---
name: run-recipes
description: Run, start, and drive the recipes web app in a real browser. Use when asked to run the app, check a change in the browser, take a screenshot of the UI, smoke-test or regression-test search and the recipe checklist, or run the unit tests.
---

A React + Vite static site. Agents drive it with `.claude/skills/run-recipes/driver.mjs`, which reuses or starts the Vite dev server and runs a _flow_ (a short Playwright script) in headless Chrome. All paths are relative to the repo root.

## Setup

Node 26 (see `.nvmrc`). Chrome or Edge must be installed; the driver uses the installed browser through `playwright-core` and doesn't download its own.

```bash
npm ci
npm install --prefix .claude/skills/run-recipes   # driver's own deps, not added to the app
```

## Run (agent path)

```bash
node .claude/skills/run-recipes/driver.mjs              # smoke flow
node .claude/skills/run-recipes/driver.mjs regression   # 26 browser checks
node .claude/skills/run-recipes/driver.mjs path/to/my-flow.mjs
```

It prints `PASS`/`FAIL` per check and exits non-zero if any check fails. Screenshots go to `.claude/skills/run-recipes/shots/` (gitignored); open and look at them. Every run also checks that there are no console errors.

| Option                   | Effect                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smoke` (default)        | Loads the page, searches "lentil", opens it, checks an ingredient.                                                                                                  |
| `regression`             | Counter, native Escape, focus return, accessible step names, checked state across recipes, checkmark and focus styles, no `---` separator text, React key warnings. |
| `--random`               | Keep the app's random first recipe. By default `Math.random()` returns 0, so the page opens on the first recipe by name (Instant-pot Creamy Sausage Pasta).         |
| `RECIPES_PORT=5174`      | Use another port. Use this when 5173 is serving something else.                                                                                                     |
| `BROWSER_CHANNEL=msedge` | Use Edge instead of Chrome.                                                                                                                                         |

**To check a change in the browser, write a flow.** A flow is a `.mjs` file with a default export:

```js
export default async function ({ page, shot, check, consoleMsgs }) {
  await page.getByLabel('Search recipes').pressSequentially('pasta', { delay: 30 });
  await page.getByRole('button', { name: 'Instant-pot Creamy Sausage Pasta' }).click();
  check('recipe opened', await page.getByRole('heading', { level: 1 }).textContent());
  await page.screenshot({ path: shot('my-check.png') });
}
```

If the check is worth keeping, add it to `flows/regression.mjs`.

## Run (human path)

```bash
npm run dev   # opens http://localhost:5173/recipes/ in your browser; Ctrl+C to stop
```

## Test

```bash
npm test      # Vitest + jsdom
```

From Git Bash, `cd /C/...` first. See Gotchas.

## Gotchas

- **The app lives at `/recipes/`, not `/`.** `vite.config.js` sets `base: '/recipes'`, and `/` returns a 302 redirect.
- **A dev server may already be running on 5173.** Usually it's the user's own `npm run dev`. The driver reuses it, since it serves the current files with hot reload. Starting a second one with `--strictPort` fails with `EADDRINUSE`, and you shouldn't stop the user's server.
- **Don't use `npm run dev` for agent runs.** It passes `--open`, which pops a browser window on the user's screen. The driver runs `node_modules/vite/bin/vite.js` directly, so it can also stop the server cleanly.
- **Escape behaves differently in jsdom and in real browsers.** Chrome and Edge clear an `<input type="search">` when you press Escape; jsdom doesn't. Unit tests can't see this, but the `regression` flow covers it.
- **Debounced UI can flash between your checks.** Search updates 200ms after typing stops. To catch a one-frame flash, record changes with a `MutationObserver`, as `regression` does for the result counter.
- **Use semantic locators.** Locate elements with `getByRole` and `getByLabel`, and get the accessibility tree with `locator.ariaSnapshot()`. This matches the project's accessibility rules in `AGENTS.md`.

## Troubleshooting

- **`TypeError: path.lastIndexOf is not a function` from `page.screenshot`**: the path was a `URL` object. Use `shot('name.png')`, which returns a string.
- **Vitest: `failed to find the current suite`**: the shell's working directory has a lowercase drive letter (`c:\`, the Git Bash default here). Run from `/C/...`, and delete `node_modules/.vite` and `node_modules/.vitest-cache` if it keeps failing.
- **PowerShell: `npm.ps1 cannot be loaded because running scripts is disabled`**: Windows execution policy. Use `npm.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. That's the user's decision.
- **`npm warn install-scripts ... esbuild`** on `npm ci`: npm on Node 26 skips install scripts until they're approved. The build and dev server work without it.
