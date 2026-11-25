---
name: run-recipes
description: Run, start, and drive the recipes web app in a real browser. Use when asked to run the app, check a change in the browser, take a screenshot of the UI, run the browser checks (CSS, contrast, focus outlines, native browser behavior), or run the unit tests.
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
node .claude/skills/run-recipes/driver.mjs                       # regression: the browser-only checks
node .claude/skills/run-recipes/driver.mjs <scratchpad>/my-flow.mjs   # a one-off check you wrote
```

It prints `PASS`/`FAIL` per check and exits non-zero if any check fails. Screenshots go to `.claude/skills/run-recipes/shots/` (gitignored); open and look at them. Every run also checks that there are no console errors.

| Option                   | Effect                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regression` (default)   | Checks only a real browser can do: native Escape in the search box, no sideways jump between recipes, the checkmark, the focus outline, light/dark contrast, the theme setting overriding the system, React key warnings, and layout at 8 phone, tablet, and Nest Hub sizes with touch (no sideways scroll, tap-target sizes, the results panel on screen, step focus outline). Runs in CI and the pre-push hook. |
| `--fresh`                | Always start a new dev server from this checkout, and fail if the port is taken, instead of reusing a server that may be serving other code. CI and the pre-push hook use it.                                                                                                                                                                                                                                     |
| `--random`               | Keep the app's random first recipe. By default `Math.random()` returns 0, so the page opens on the first recipe by name (Creamy Sausage Pasta).                                                                                                                                                                                                                                                                   |
| `RECIPES_PORT=5174`      | Use another port. Use this when 5173 is serving something else.                                                                                                                                                                                                                                                                                                                                                   |
| `BROWSER_CHANNEL=msedge` | Use Edge instead of Chrome.                                                                                                                                                                                                                                                                                                                                                                                       |

**To check a change in the browser, write a one-off flow in your scratchpad, not in the repo.** A flow is a `.mjs` file with a default export:

```js
export default async function ({ page, shot, check, consoleMsgs }) {
  await page.getByRole('link', { name: 'All recipes' }).click();
  await page.getByRole('main').getByRole('link').first().click();
  check('a recipe opened', await page.getByRole('heading', { level: 1 }).textContent());
  await page.screenshot({ path: shot('my-check.png') });
}
```

Only add a check to `flows/regression.mjs` if it **needs a real browser** (CSS, layout, native behavior) and **doesn't depend on the recipe data**: no recipe names, counts, or search words. Read what you need from the page (the open recipe's `h1`, the All recipes links). Anything a unit test can check belongs in Vitest. Committed flows that named recipes broke every time the recipes changed, and that's why there's only one flow now.

## Run (human path)

```bash
npm run dev   # opens http://localhost:5173/recipes/ in your browser; Ctrl+C to stop
```

## Test

```bash
npm test      # Vitest + jsdom
```

Use `npm test`, not `npx vitest`, which fails every test on Windows when the folder path starts with a lowercase `c:`.

## Gotchas

- **The app lives at `/recipes/`, not `/`.** `vite.config.js` sets `base: '/recipes'`, and `/` returns a 302 redirect.
- **A dev server may already be running on 5173.** Usually it's the user's own `npm run dev`. Without `--fresh`, the driver reuses it, since it serves the current files with hot reload. That's only right if it's serving this checkout and branch. Starting a second one with `--strictPort` fails with `EADDRINUSE`, and you shouldn't stop the user's server.
- **Don't use `npm run dev` for agent runs.** It passes `--open`, which pops a browser window on the user's screen. The driver runs `node_modules/vite/bin/vite.js` directly, so it can also stop the server cleanly.
- **Escape behaves differently in jsdom and in real browsers.** Chrome and Edge clear an `<input type="search">` when you press Escape; jsdom doesn't. Unit tests can't see this, but `regression` checks it.
- **Debounced UI can flash between your checks.** Search updates 200ms after typing stops. To catch a one-frame flash, record changes with a `MutationObserver`. The result counter's no-flash behavior is covered by a unit test.
- **Use semantic locators.** Locate elements with `getByRole` and `getByLabel`, and get the accessibility tree with `locator.ariaSnapshot()`. This matches the project's accessibility rules in `AGENTS.md`.

## Troubleshooting

- **`TypeError: path.lastIndexOf is not a function` from `page.screenshot`**: the path was a `URL` object. Use `shot('name.png')`, which returns a string.
- **Vitest: `failed to find the current suite`**: Vitest was run directly (`npx vitest`) from a lowercase `c:\` path. Use `npm test` instead.
- **PowerShell: `npm.ps1 cannot be loaded because running scripts is disabled`**: Windows execution policy. Use `npm.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. That's the user's decision.
- **`npm warn install-scripts ... esbuild`** on `npm ci`: npm on Node 26 skips install scripts until they're approved. The build and dev server work without it.
