# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Commands

- `npm run dev`: Vite dev server on port 5173 (opens the browser automatically)
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the built `dist/`
- `npm run lint`: ESLint (flat config, `eslint.config.js`)
- `npm run format` / `npm run format:check`: Prettier (single quotes, semicolons, 100 columns). Run `format` before committing; CI fails on unformatted files.
- `npm test`: run Vitest once (jsdom + React Testing Library); `npm run test:watch` for watch mode
- `npx vitest run src/components/search` or `npx vitest run -t "Escape"`: run one file or one test by name

Tests sit next to the code they test (`*.test.jsx`); shared setup is in `src/test/setup.js`. Requires Node 26 (see `.nvmrc`).

**Windows:** run Vitest from a working directory with an uppercase drive letter (`C:\...`; in Git Bash, `cd /C/...` rather than `/c/...`). A lowercase `c:\` makes Vitest load the setup file as a separate module copy and fail with "failed to find the current suite". If it starts failing after switching paths, delete `node_modules/.vite` and `node_modules/.vitest-cache`.

## Deployment

`.github/workflows/ci.yml` has a `check` job (lint, format check, tests, build; Node version from `.nvmrc`) that runs on pull requests and on pushes to `main`. A push to `main` deploys to GitHub Pages (<https://grfinch.github.io/recipes/>), but only after `check` passes.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs. `.github/workflows/dependabot-auto-merge.yml` auto-merges patch and minor updates once `check` passes; majors need review. ESLint 10 is on hold until `eslint-plugin-react` and `eslint-plugin-jsx-a11y` support it.

`vite.config.js` sets `base: '/recipes'`, so the app is served from a sub-path. Asset URLs and any future routing must respect that base: use `import.meta.env.BASE_URL` or imported assets rather than root-absolute paths.

## Architecture

This is a static, client-only React 19 app (plain JSX, no TypeScript, no router, no backend). All data is bundled from `src/recipes.json`.

**Data flow:** `App.jsx` imports `recipes.json` and holds the `selected` state. The first recipe comes from the URL hash, or is random if the hash names none. `SearchBox` receives every recipe and calls `onSelect`. `Recipe` renders the selected one.

**Recipe links:** the selected recipe lives in the URL hash as `#/<slug>` (`src/utils/recipeHash.js`; the slug is the lowercased name with accents and punctuation removed). Selecting a recipe sets the hash, which adds a history entry. A `hashchange` listener handles Back, Forward and edited links. The first recipe, or one replacing an unknown hash, uses `history.replaceState`, so it adds no history entry. The tab title follows the recipe. The hash needs no router and works under the `/recipes` base. Renaming a recipe changes its slug and breaks old links to it.

**Recipe schema** (`src/recipes.json` → `{ recipes: [...] }`):

- `name`, `course`, `cookingMethod`: strings. `course` and `cookingMethod` are not used in the UI yet.
- `ingredients`: an **array of arrays** of strings. Each inner array is a group, and groups are separated by a divider when rendered.
- `instructions`: a flat array of strings.
- `notes`: an optional flat array of strings.

**Rendering lists:** `RecipeSection` normalizes `listItems` into groups. It accepts either nested arrays or a flat array, where any string starting with `-` acts as a group separator. It picks the item component from the `ordered` and `clickable` props:

- `CheckboxItem`: unordered and clickable (ingredients)
- `NumberedClickableItem`: ordered and clickable (instructions)
- `BulletItem`: not clickable (notes)

Items are controlled: `Recipe` owns the "checked" state through `src/hooks/useCheckedItems.js` and passes `checked` and `onToggle` down through `RecipeSection`. The hook saves each recipe's checked item ids (`<section header>:<group>-<item>`) to `localStorage` under `recipes:checked:<recipe name>`, so they survive a reload. "Reset checklist" clears them. Ids are positions, so reordering a recipe's items in `recipes.json` moves any saved checks with them.

**Keep screen on:** `KeepScreenOn` (in the header) is an opt-in checkbox backed by `src/hooks/useWakeLock.js` and the Screen Wake Lock API. It renders nothing in browsers without `navigator.wakeLock`. Browsers release the lock when the tab is hidden, so the hook requests it again on `visibilitychange`. If a request is refused, the box unchecks and a polite `aria-live` message explains why. It is deliberately not `role="status"`, so it stays separate from the search result count. jsdom has no Wake Lock API, so tests install a fake `navigator.wakeLock`.

**Search:** `SearchBox` uses `src/hooks/useDebounce.js`, which returns `[value, setValue, debouncedValue, { cancel, flush, reset }]`. It filters by name, ingredients, instructions, and notes with a case-insensitive substring match. Results appear in a `position: fixed` overlay positioned from the input's bounding rect. Clicking outside or pressing Escape closes the overlay.

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
