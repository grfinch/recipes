# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Commands

- `npm run dev`: Vite dev server on port 5173 (opens the browser automatically)
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the built `dist/`
- `npm run lint`: ESLint (flat config, `eslint.config.js`)

There is no test framework set up yet.

## Deployment

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml` (Node version from `.nvmrc`, `npm ci` then `npm run build`). `vite.config.js` sets `base: '/recipes'`, so the app is served from a sub-path. Asset URLs and any future routing must respect that base: use `import.meta.env.BASE_URL` or imported assets rather than root-absolute paths.

## Architecture

This is a static, client-only React 19 app (plain JSX, no TypeScript, no router, no backend). All data is bundled from `src/recipes.json`.

**Data flow:** `App.jsx` imports `recipes.json`, picks a random recipe as the initial selection, and holds the `selected` state. `SearchBox` receives every recipe and calls `onSelect`. `Recipe` renders the selected one.

**Recipe schema** (`src/recipes.json` → `{ recipes: [...] }`):
- `name`, `course`, `cookingMethod`: strings. `course` and `cookingMethod` are not used in the UI yet.
- `ingredients`: an **array of arrays** of strings. Each inner array is a group, and groups are separated by a divider when rendered.
- `instructions`: a flat array of strings.
- `notes`: an optional flat array of strings.

**Rendering lists:** `RecipeSection` normalizes `listItems` into groups. It accepts either nested arrays or a flat array, where any string starting with `-` acts as a group separator. It picks the item component from the `ordered` and `clickable` props:
- `CheckboxItem`: unordered and clickable (ingredients)
- `NumberedClickableItem`: ordered and clickable (instructions)
- `BulletItem`: not clickable (notes)

The "checked" state on each item is local component state and is not persisted.

**Search:** `SearchBox` uses `src/hooks/useDebounce.js`, which returns `[value, setValue, debouncedValue, { cancel, flush, reset }]`. It filters by name, ingredients, instructions, and notes with a case-insensitive substring match. Results appear in a `position: fixed` overlay positioned from the input's bounding rect. Clicking outside or pressing Escape closes the overlay.

## Conventions

- Component styles use CSS Modules (`*.module.css` imported as `styles`). Global styles live in `src/index.css` and `src/App.css`.
- Component files are in PascalCase and match their default export (`RecipeSection.jsx` → `RecipeSection`). Hooks are camelCase (`useDebounce.js`). Folders and CSS modules are camelCase.
- Import paths must match the file name's case exactly. Windows ignores case, but the Linux CI build doesn't, so a mismatch passes locally and breaks the deploy.
- ESLint uses `eslint-plugin-react`, so components used only in JSX count as used. `no-unused-vars` exempts only `_`-prefixed names, and `react/prop-types` is off (React 19 ignores propTypes).
