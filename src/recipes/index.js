// Every recipe lives in its own file, src/recipes/<id>.json, so adding one never touches
// another and two add-recipe PRs can't conflict. Vite bundles them all at build time.
const modules = import.meta.glob('./*.json', { eager: true, import: 'default' });

const recipes = Object.values(modules).sort((a, b) => a.name.localeCompare(b.name));

export default recipes;

// Dev server only: when a recipe file is added, edited, or removed, reload the whole page.
// Hot-swapping the list in place leaves parts of App on the old list (its hashchange
// listener, and the recipe being shown), so a new recipe would appear in "All recipes" but
// its link wouldn't open. Saved checklists (localStorage) and the URL survive the reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload());
}
