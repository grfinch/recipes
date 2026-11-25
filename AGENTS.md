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
- `npm test -- src/components/search` or `npm test -- -t "Escape"`: run one file or one test by name

Tests sit next to the code they test (`*.test.jsx`); shared setup is in `src/test/setup.js`. Requires Node 26 (see `.nvmrc`). Run Vitest through `npm test` or `npm run test:watch`, not `npx vitest`: `scripts/vitest.mjs` works around a Windows path bug that otherwise fails every test.

**Parallel agents:** each agent that runs the app or the browser flows (`.claude/skills/run-recipes/`) needs its own port and its own git worktree. Set a different `RECIPES_PORT` for each (5174, 5175, …), and leave 5173 for the main checkout. The driver reuses any dev server already on its port, even one serving another checkout or stale files, so a shared port can test the wrong code. Check that the driver prints "Started dev server", not "Reusing".

**Worktrees:** make one only when work runs in parallel (two agents at once, or an agent working while someone uses the main checkout). Work done one task at a time just needs a branch. Use one worktree per branch, and reuse it until that branch's PR merges.

- Put every worktree in `../recipes.worktrees/<branch-name>`, named after its branch. Never put one inside the repo (for example under `.claude/worktrees/`), because ESLint and Vitest would scan it. Claude Code's built-in worktree isolation does exactly that, so run `git worktree add` yourself.
- Create it from an up-to-date `main`: `git fetch`, then `git worktree add ../recipes.worktrees/<branch> -b <branch> origin/main`.
- In the new worktree, run `npm ci`. Copy `.env.local` from the main checkout if the work needs it (it's gitignored, so a new worktree doesn't have one, and the suggest page acts differently without it). Use your own `RECIPES_PORT`.
- A branch can be checked out in only one worktree at a time.
- After the PR merges, run `git worktree remove ../recipes.worktrees/<branch>`, then `git branch -d <branch>`. Don't delete the folder by hand. If one was deleted, `git worktree prune` clears the stale entry.
- To find leftovers: `git fetch --prune`, `git worktree list`, and `git branch -vv` (a branch marked `: gone]` usually had its PR merged). Check `git status` in a worktree before removing it.

**Git hooks** (husky, installed by `npm ci`/`npm install` through the `prepare` script):

- `pre-commit` runs lint-staged (`lint-staged.config.js`) on the staged files: `eslint --fix` and `prettier --write`, with the fixes added to the commit, plus `npm run validate:recipes` when a recipe or `src/recipeCategories.json` is staged. A commit whose only change Prettier undoes is stopped as empty.
- `pre-push` runs CI's `check` steps: lint, format check, recipe validation, tests, build, and the browser checks (on port 5199 with `--fresh`; parallel agents set `PREPUSH_PORT` to their own port).
- Don't bypass them with `--no-verify` to get past a failure; fix the cause.

## Deployment

`.github/workflows/ci.yml` has a `check` job (lint, format check, recipe validation, tests, build, and the browser checks in `.claude/skills/run-recipes/flows/regression.mjs`; Node version from `.nvmrc`) that runs on pull requests and on pushes to `main`. A push to `main` deploys to GitHub Pages (<https://grfinch.github.io/recipes/>), but only after `check` passes.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs. `.github/workflows/dependabot-auto-merge.yml` auto-merges patch and minor updates once `check` passes; majors need review. ESLint 10 is on hold until `eslint-plugin-react` and `eslint-plugin-jsx-a11y` support it.

`vite.config.js` sets `base: '/recipes'`, so the app is served from a sub-path. Asset URLs and any future routing must respect that base: use `import.meta.env.BASE_URL` or imported assets rather than root-absolute paths.

## Architecture

This is a static, client-only React 19 app (plain JSX, no TypeScript, no router, no backend). All data is bundled from the recipe files in `src/recipes/`: one file per recipe, `src/recipes/<id>.json`, loaded by `src/recipes/index.js` (`import.meta.glob`, sorted by name). One file each means two PRs that add recipes never conflict. Tests mock `./recipes/index.js`, not the JSON files. With the dev server, adding, editing, or removing a recipe file reloads the whole page (`import.meta.hot` in `index.js`), because hot-swapping the list would leave `App`'s hashchange listener and the shown recipe on the old data.

**Data flow:** `App.jsx` imports the recipe list from `./recipes/index.js` and holds a `view` state: `{ page: 'recipe', recipe }`, `{ page: 'browse', course?, method? }`, `{ page: 'suggest' }` or `{ page: 'pick' }` (`null` only when there are no recipes). The first view comes from the URL hash, or is a random recipe if the hash names none. `SearchBox` receives every recipe and calls `onSelect`. `Recipe` renders a recipe view; `BrowseRecipes` renders the browse view.

**Recipe links:** the selected recipe lives in the URL hash as `#/<id>` (`src/utils/recipeHash.js`). The id is permanent, so renaming a recipe keeps its links working. Selecting a recipe sets the hash, which adds a history entry. A `hashchange` listener handles Back, Forward and edited links. The first recipe, or one replacing an unknown hash, uses `history.replaceState`, so it adds no history entry. The tab title follows the page. The hash needs no router and works under the `/recipes` base.

**Browse view:** `#/browse` shows `BrowseRecipes`, every recipe as a link (`hashFor(recipe)`) sorted by name, with `course` and `cookingMethod` as muted text. `BrowseFilters` above the list has a Course and a Cooking method filter: radio chips in a `<fieldset>` each, with an "All" choice and only the values recipes use (`filterOptions` in `src/utils/recipeFilters.js`, ordered as `recipeCategories.json` lists them). A `role="status"` in `<main>` announces the count, separate from the search box's. The filters live in the hash, `#/browse?course=Dinner&method=Slow+cooker`: `viewFromHash` ignores unknown parameters and values no recipe uses, matches case-insensitively, and the URL is rewritten to the clean form. A filter change uses `history.replaceState`, so it adds no history entry and doesn't move focus; Back from a recipe returns to the filtered list. `recipeHash.js` must not import JSON, because `scripts/validate-recipes.mjs` imports it in plain Node. The header's "All recipes" link is a plain `<a>` (with `aria-current="page"` while on the browse page) that goes to `#/browse` with no filters; links change the hash natively and the `hashchange` listener does the rest. For a way out after an accidental tap, `App` remembers the last recipe shown (`lastRecipe`). On the browse page it passes that recipe to `BrowseRecipes` as `returnTo`, which shows a "Back to <name>" link above the heading and filters, and it points the highlighted pill at the same recipe, its name still "All recipes" and a visually hidden "Back to <name>" as its `aria-describedby` description. Both appear only when a recipe was shown earlier in the visit: a deep link to `#/browse` has neither. Changing a filter keeps `returnTo`. `viewFromHash` checks reserved page slugs (`RESERVED_SLUGS` in `recipeHash.js`) before looking up recipes, so a recipe named "Browse" could never be opened by link. The validator and a test fail if a recipe's id is a reserved name. Add any new page's slug to `RESERVED_SLUGS`. After every page or recipe change except the first load (not a filter change), `App` focuses the new page's `h1` (it has `tabIndex={-1}`, and `index.css` hides its outline), so keyboard and screen-reader users start at the top of the new content. Any new page needs an `h1` with `tabIndex={-1}`. The one exception is coming back to the browse page from a recipe opened there (by Back or the header pill): `App` focuses that recipe's link instead (each list link has `data-recipe-id`) and scrolls it to the top of the screen, so a long list keeps the visitor's place. A trip to that recipe's Suggest a change page and back still counts; arriving at the recipe any other way, or the link being filtered out, falls back to the `h1`.

**Long lists:** with more than `LETTER_GROUP_THRESHOLD` (30) recipes shown, `BrowseRecipes` splits the list into A–Z sections (`groupByLetter` in `recipeFilters.js`: first letter without accents, and digits, symbols and other scripts under `#`, listed first). Each section gets an `h2` with `tabIndex={-1}`, and a "Jump to letter" `<nav>` above the list has one button per letter in use. The jump links are buttons, not `#letter` anchors, because the hash is the router. A button focuses its section's heading and scrolls it to the top. Shorter lists stay one plain list. Rendering needs no virtualization: a few thousand plain links are cheap, and virtualizing would break Ctrl+F and screen-reader browsing. The real limit on size is that `src/recipes/index.js` bundles every recipe into the main script, so plan to lazy-load recipe bodies when the collection nears ~300.

**Suggest page:** `#/suggest` shows `SuggestRecipe` (`src/components/suggest/`), a form where visitors suggest a recipe. The site footer (on every page) links to it, and so do the browse page and the empty state. It is in the footer rather than the header to keep the header to the one "All recipes" pill on phones. Fields and limits live in `src/utils/suggestion.js`: name, ingredients and steps are required, and the rest are optional. Errors show only after Send: a focused summary links to each field, and the summary links move focus without changing the hash. The unsent draft is kept in `localStorage` under `recipes:suggestion-draft`. It POSTs JSON to `VITE_SUGGEST_ENDPOINT`, a relay that opens a GitHub issue, with a Cloudflare Turnstile token (`src/hooks/useTurnstile.js`, only when `VITE_TURNSTILE_SITE_KEY` is set) and a hidden honeypot field. Without an endpoint (dev, tests, forks), the page shows a link to GitHub issues instead of the form. Tests pass `endpoint` and `turnstileSiteKey` as props, and they fake `fetch` and `window.turnstile`.

**Suggest a change:** every recipe ends with a "Suggest a change" link to `#/suggest-change?recipe=<id>` (`changeHashFor` in `recipeHash.js`), which shows `SuggestChange` for that recipe: a short form for a fix, an improvement, or a tip. An unknown recipe id there is treated like any unknown link. The page has a "Back to <name>" link, and its tab title names the recipe. Its fields and limits live in `src/utils/recipeChange.js`: a kind (from `CHANGE_KINDS`), the suggestion (required), and an optional name. It shares `Field`, `ErrorSummary` and `sendToRelay` with the suggest page, and it behaves the same way: errors after Send, Turnstile, the honeypot, and the GitHub fallback without an endpoint (here, a new issue titled after the recipe). It keeps a draft per recipe under `recipes:change-draft:<id>`. It POSTs to the same relay with `type: 'change'` and the recipe's id, never its name.

**Pick page:** `#/pick` shows `PickRecipe` (`src/components/pick/`), "Pick a recipe for me", for visitors who can't decide. It reuses `BrowseFilters` (with `name="pick"` for its radio groups) and adds an optional "Ingredients you have" box, split on commas. "Pick for me" shows a random matching recipe in a card, inside an `aria-live` region, and focus stays on the button, which then reads "Pick another" and never repeats the current pick when there's another match. The matching lives in `src/utils/recipePick.js`: every ingredient term must start a word in some ingredient line (not steps or notes), ignoring case, and plurals match by their stem ("potatoes" finds "1 potato"). A `role="status"` gives the match count, and names any ingredient no recipe uses. The choices and the pick live in `App` state, not the hash, so opening the pick and coming Back shows them again; changing a choice drops the pick. The footer and the browse page link to it.

**Suggestion pipeline:** `relay/` is a Cloudflare Worker (its own `package.json`, deployed with wrangler; setup is in `relay/README.md`). It checks the origin, size, honeypot, rate limit, Turnstile and fields, then opens a GitHub issue labeled `recipe-suggestion` with a fine-grained token. A request with `type: 'change'` is checked with `recipeChange.js` and opens a `recipe-change` issue that links to the recipe's file; no workflow acts on those, and the owner edits the recipe by hand. Visitor text goes inside code fences with `@` mentions broken up. When the repo owner adds the `make-recipe-pr` label, `.github/workflows/recipe-suggestion.yml` runs the `add-recipe` skill in unattended mode:

- Claude may only write to its temp folder and run `write-recipe.mjs`.
- A shell guard then requires that the only change is one new `src/recipes/<id>.json`, and runs Prettier, validation, the tests and the recipe's browser check.
- The workflow commits, opens a draft PR (`Closes #N`), and dispatches `ci.yml`, because PRs opened with `GITHUB_TOKEN` don't trigger CI.
- If it can't draft the recipe, it comments with questions (`needs-info`) or closes the issue as not a recipe.

`claude.yml` ignores issues labeled `recipe-suggestion` or `recipe-change`, because the relay opens them with the owner's token.

**Recipe schema** (`src/recipes/<id>.json`, one recipe object per file):

- `id`: required, permanent, and equal to the file name. Lowercase letters, digits and dashes, made once from the name with `slugify` and never changed afterwards, even if the recipe is renamed. It is the recipe's link (`#/<id>`) and its saved-checklist key, and it must not be a reserved slug.
- `name`, `course`, `cookingMethod`: strings. `course` and `cookingMethod` come from the lists in `src/recipeCategories.json`. They show in the browse list and on the recipe page, under the title (a `<dl>`, each value a link to the browse page filtered by it, `hashForView`).
- `ingredients`, `instructions`: arrays of **groups**, `{ "title"?: string, "items": [string] }`. Every group has at least one item. Titled groups render an `h3`; untitled ones are set apart by a decorative dashed rule (CSS only, nothing for screen readers to read).
- `notes`: optional, the same group shape. Leave it out rather than writing `[]`.

`course` and `cookingMethod` must be values listed in `src/recipeCategories.json`. `scripts/validate-recipes.mjs` (`npm run validate:recipes`, also run in CI) checks every recipe file: valid JSON, required fields, unknown fields, the id's format and that it matches the file name, duplicate ids and names, reserved ids, and the group shape (no empty groups or titles, no unknown group fields, no leftover `"---"` items). To add a recipe, use the `add-recipe` skill (`.claude/skills/add-recipe/`), which drafts, validates, and opens a PR.

**Rendering lists:** `RecipeSection` takes a section's `groups` and renders, under its `h2`, each group's optional `h3` title and its own list. Step numbers restart at 1 in each group, so each stage ("Sauté", "Pressure cook") counts its own steps. It picks the item component from the `ordered` and `clickable` props:

- `CheckboxItem`: unordered and clickable (ingredients)
- `NumberedClickableItem`: ordered and clickable (instructions)
- `BulletItem`: not clickable (notes)

Items are controlled: `Recipe` owns the "checked" state through `src/hooks/useCheckedItems.js` and passes `checked` and `onToggle` down through `RecipeSection`. The hook saves each recipe's checked item ids (`<section header>:<group>-<item>`) to `localStorage` under `recipes:checked:<recipe id>`, so they survive a reload and a rename. "Reset checklist" clears them. Ids are positions, so reordering a recipe's items moves any saved checks with them.

**Printing:** a recipe's "Print" button (beside "Reset checklist") calls `window.print()`. Print styles live in `@media print` blocks beside the screen styles: `index.css` forces black-on-white tokens whatever the theme, `App.css` hides the site header and footer, `recipe.module.css` hides the buttons and "Suggest a change" and uses one column, and `listItems.module.css` prints a clean copy (empty boxes, step numbers instead of checks, no strikethrough, tighter rows). A done step keeps its number in a `printOnly` span, so the printout never shows a ✓. Any new on-screen control on the recipe page should be hidden in print.

**Keep screen on:** `KeepScreenOn` (in the header) is an opt-in checkbox backed by `src/hooks/useWakeLock.js` and the Screen Wake Lock API. It renders nothing in browsers without `navigator.wakeLock`. Browsers release the lock when the tab is hidden, so the hook requests it again on `visibilitychange`. If a request is refused, the box unchecks and a polite `aria-live` message explains why. It is deliberately not `role="status"`, so it stays separate from the search result count. jsdom has no Wake Lock API, so tests install a fake `navigator.wakeLock`.

**Theme:** `ThemePicker` (`src/components/theme/`) sits in the header beside Keep screen on, in a `headerSettings` row that wraps on small phones. It is a compact 44px button (a decorative icon, named by visually hidden "Theme" text) that shows a panel with a "Theme" radio group: System, Light or Dark. It is a disclosure, not a menu: Tab moves from the button into the panel, and Escape, a tap outside, or focus moving elsewhere closes it (Escape returns focus to the button). It is compact because the header shares one row with the search box on the Nest Hub and phones held sideways; a labeled control there squeezed the search box to 40px. `src/hooks/useTheme.js` saves the choice in `localStorage` under `recipes:theme` (System removes it) and sets `data-theme="light"` or `"dark"` on `<html>`. Under System, it follows the device's `prefers-color-scheme`, including changes while the page is open. A choice made in another tab applies too. A small inline script in `index.html` sets `data-theme` before the first paint, so a dark-theme visitor never sees a white flash. It duplicates the hook's rules, so keep the two in step. The CSS draws whatever `data-theme` says, never the media query: light values are the defaults, and dark ones go under `:root[data-theme='dark']` (in a CSS module, `:root[data-theme='dark'] .someClass`). The Turnstile widget gets the same theme. jsdom has no `matchMedia`, so tests install a fake one.

**Search:** `SearchBox` uses `src/hooks/useDebounce.js`, which returns `[value, setValue, debouncedValue, { cancel, flush, reset }]`. It filters with `matchesQuery` (`src/utils/recipeSearch.js`): a case-insensitive substring match against the name, course, cooking method, group titles, and each ingredient, step, and note separately, so a query can't match across two items. Results appear in a `position: fixed` overlay positioned from the input's bounding rect. Clicking outside or pressing Escape closes the overlay.

## Conventions

- Component styles use CSS Modules (`*.module.css` imported as `styles`). Global styles live in `src/index.css` and `src/App.css`. Colors come from the tokens on `:root` in `src/index.css` (`--text`, `--muted`, `--link`, `--surface`, `--line`, and others), with light and dark values; use them rather than literal colors, so both schemes keep their contrast. Dark values go under `:root[data-theme='dark']`, not `@media (prefers-color-scheme: dark)`, so the site's theme setting can override the device (see **Theme**).
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
