# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Commands

- `npm run dev`: Vite dev server on port 5173 (opens the browser automatically)
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the built `dist/`
- `npm run lint`: ESLint (flat config, `eslint.config.js`)
- `npm run format` / `npm run format:check`: Prettier (single quotes, semicolons, 100 columns). CI fails on unformatted files; the pre-commit hook formats staged files for you.
- `npm run validate:recipes`: check every recipe file in `src/recipes/` against the schema and allowed categories
- `npm test`: run Vitest once (jsdom + React Testing Library); `npm run test:watch` for watch mode
- `npx vitest run src/components/search` or `npx vitest run -t "Escape"`: run one file or one test by name

Tests sit next to the code they test (`*.test.jsx`); shared setup is in `src/test/setup.js`. Requires Node 26 (see `.nvmrc`).

**Windows:** run Vitest from a working directory with an uppercase drive letter (`C:\...`; in Git Bash, `cd /C/...` rather than `/c/...`). A lowercase `c:\` makes Vitest load the setup file as a separate module copy and fail with "failed to find the current suite". If it starts failing after switching paths, delete `node_modules/.vite` and `node_modules/.vitest-cache`.

**Parallel agents:** each agent that runs the app or the browser flows (`.claude/skills/run-recipes/`) needs its own port and its own git worktree. Set a different `RECIPES_PORT` for each (5174, 5175, …), and leave 5173 for the main checkout. The driver reuses any dev server already on its port, even one serving another checkout or stale files, so a shared port can test the wrong code. Check that the driver prints "Started dev server", not "Reusing".

**Git hooks** (husky, installed by `npm ci`/`npm install` through the `prepare` script):

- `pre-commit` runs lint-staged (`lint-staged.config.js`) on the staged files: `eslint --fix` and `prettier --write`, with the fixes added to the commit, plus `npm run validate:recipes` when a recipe or `src/recipeCategories.json` is staged. A commit whose only change Prettier undoes is stopped as empty.
- `pre-push` runs CI's `check` steps: lint, format check, recipe validation, tests, and build. It first moves to `git rev-parse --show-toplevel`, so Vitest gets an uppercase drive letter on Windows.
- Don't bypass them with `--no-verify` to get past a failure; fix the cause.

## Deployment

`.github/workflows/ci.yml` has a `check` job (lint, format check, tests, build; Node version from `.nvmrc`) that runs on pull requests and on pushes to `main`. A push to `main` deploys to GitHub Pages (<https://grfinch.github.io/recipes/>), but only after `check` passes.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs. `.github/workflows/dependabot-auto-merge.yml` auto-merges patch and minor updates once `check` passes; majors need review. ESLint 10 is on hold until `eslint-plugin-react` and `eslint-plugin-jsx-a11y` support it.

`vite.config.js` sets `base: '/recipes'`, so the app is served from a sub-path. Asset URLs and any future routing must respect that base: use `import.meta.env.BASE_URL` or imported assets rather than root-absolute paths.

## Architecture

This is a static, client-only React 19 app (plain JSX, no TypeScript, no router, no backend). All data is bundled from the recipe files in `src/recipes/`: one file per recipe, `src/recipes/<id>.json`, loaded by `src/recipes/index.js` (`import.meta.glob`, sorted by name). One file each means two PRs that add recipes never conflict. Tests mock `./recipes/index.js`, not the JSON files. With the dev server, adding, editing, or removing a recipe file reloads the whole page (`import.meta.hot` in `index.js`), because hot-swapping the list would leave `App`'s hashchange listener and the shown recipe on the old data.

**Data flow:** `App.jsx` imports the recipe list from `./recipes/index.js` and holds a `view` state: `{ page: 'recipe', recipe }` or `{ page: 'browse' }` (`null` only when there are no recipes). The first view comes from the URL hash, or is a random recipe if the hash names none. `SearchBox` receives every recipe and calls `onSelect`. `Recipe` renders a recipe view; `BrowseRecipes` renders the browse view.

**Recipe links:** the selected recipe lives in the URL hash as `#/<id>` (`src/utils/recipeHash.js`). The id is permanent, so renaming a recipe keeps its links working. Selecting a recipe sets the hash, which adds a history entry. A `hashchange` listener handles Back, Forward and edited links. The first recipe, or one replacing an unknown hash, uses `history.replaceState`, so it adds no history entry. The tab title follows the page. The hash needs no router and works under the `/recipes` base.

**Browse view:** `#/browse` shows `BrowseRecipes`, every recipe as a link (`hashFor(recipe)`) sorted by name, with `course` and `cookingMethod` as muted text. The header's "All recipes" link is a plain `<a href="#/browse">` (with `aria-current="page"` while on it); links change the hash natively and the `hashchange` listener does the rest. `viewFromHash` checks reserved page slugs (`RESERVED_SLUGS` in `recipeHash.js`) before looking up recipes, so a recipe named "Browse" could never be opened by link. The validator and a test fail if a recipe's id is a reserved name. Add any new page's slug to `RESERVED_SLUGS`. After every view change except the first load, `App` focuses the new page's `h1` (it has `tabIndex={-1}`, and `index.css` hides its outline), so keyboard and screen-reader users start at the top of the new content. Any new page needs an `h1` with `tabIndex={-1}`.

**Recipe schema** (`src/recipes/<id>.json`, one recipe object per file):

- `id`: required, permanent, and equal to the file name. Lowercase letters, digits and dashes, made once from the name with `slugify` and never changed afterwards, even if the recipe is renamed. It is the recipe's link (`#/<id>`) and its saved-checklist key, and it must not be a reserved slug.
- `name`, `course`, `cookingMethod`: strings. `course` and `cookingMethod` come from the lists in `src/recipeCategories.json` and appear only in the browse list.
- `ingredients`, `instructions`: arrays of **groups**, `{ "title"?: string, "items": [string] }`. Every group has at least one item. Titled groups render an `h3`; untitled ones are set apart by a decorative dashed rule (CSS only, nothing for screen readers to read).
- `notes`: optional, the same group shape. Leave it out rather than writing `[]`.

`course` and `cookingMethod` must be values listed in `src/recipeCategories.json`. `scripts/validate-recipes.mjs` (`npm run validate:recipes`, also run in CI) checks every recipe file: valid JSON, required fields, unknown fields, the id's format and that it matches the file name, duplicate ids and names, reserved ids, and the group shape (no empty groups or titles, no unknown group fields, no leftover `"---"` items). To add a recipe, use the `add-recipe` skill (`.claude/skills/add-recipe/`), which drafts, validates, and opens a PR.

**Rendering lists:** `RecipeSection` takes a section's `groups` and renders, under its `h2`, each group's optional `h3` title and its own list. Step numbers restart at 1 in each group, so each stage ("Sauté", "Pressure cook") counts its own steps. It picks the item component from the `ordered` and `clickable` props:

- `CheckboxItem`: unordered and clickable (ingredients)
- `NumberedClickableItem`: ordered and clickable (instructions)
- `BulletItem`: not clickable (notes)

Items are controlled: `Recipe` owns the "checked" state through `src/hooks/useCheckedItems.js` and passes `checked` and `onToggle` down through `RecipeSection`. The hook saves each recipe's checked item ids (`<section header>:<group>-<item>`) to `localStorage` under `recipes:checked:<recipe id>`, so they survive a reload and a rename. "Reset checklist" clears them. Ids are positions, so reordering a recipe's items moves any saved checks with them.

**Keep screen on:** `KeepScreenOn` (in the header) is an opt-in checkbox backed by `src/hooks/useWakeLock.js` and the Screen Wake Lock API. It renders nothing in browsers without `navigator.wakeLock`. Browsers release the lock when the tab is hidden, so the hook requests it again on `visibilitychange`. If a request is refused, the box unchecks and a polite `aria-live` message explains why. It is deliberately not `role="status"`, so it stays separate from the search result count. jsdom has no Wake Lock API, so tests install a fake `navigator.wakeLock`.

**Search:** `SearchBox` uses `src/hooks/useDebounce.js`, which returns `[value, setValue, debouncedValue, { cancel, flush, reset }]`. It filters with `matchesQuery` (`src/utils/recipeSearch.js`): a case-insensitive substring match against the name, course, cooking method, group titles, and each ingredient, step, and note separately, so a query can't match across two items. Results appear in a `position: fixed` overlay positioned from the input's bounding rect. Clicking outside or pressing Escape closes the overlay.

## Conventions

- Component styles use CSS Modules (`*.module.css` imported as `styles`). Global styles live in `src/index.css` and `src/App.css`.
- Component files are in PascalCase and match their default export (`RecipeSection.jsx` → `RecipeSection`). Hooks are camelCase (`useDebounce.js`). Folders and CSS modules are camelCase.
- Import paths must match the file name's case exactly. Windows ignores case, but the Linux CI build doesn't, so a mismatch passes locally and breaks the deploy.
- ESLint has separate blocks for different code: `src/` gets React, hooks (including the React Compiler rules), react-refresh, `jsx-a11y`, and browser globals. Config files and `.claude/` scripts get Node globals. The browser flows in `.claude/skills/` get both, because their `page.evaluate()` callbacks run in the page. `eslint-config-prettier` comes last, to turn off style rules.
- `no-unused-vars` exempts only `_`-prefixed names (`eslint-plugin-react` marks JSX usage). `react/prop-types` is off, because React 19 ignores propTypes. Don't disable lint rules to get past an error: fix the cause, or ask.

## Accessibility

Always follow accessibility best practices (WCAG 2.2 AA) in every change:

- Prefer semantic HTML (`<button>`, `<label>`, `<input type="checkbox">`, lists, headings) over `div`s with ARIA roles.
- Accessible names should come from visible text. `aria-label` replaces an element's content for screen readers, so use it only when there is no visible text.
- Everything clickable must work from the keyboard, with a visible focus style. When UI closes (overlays, dialogs), move focus somewhere sensible.
- Announce dynamic updates (like result counts) with `role="status"` or `aria-live`. Hide decorative symbols with `aria-hidden="true"`.
- Keep text contrast at 4.5:1 or higher, and don't rely on color alone to show state.
- In tests, query by role and accessible name (`getByRole('button', { name })`), so tests fail when accessibility breaks.
