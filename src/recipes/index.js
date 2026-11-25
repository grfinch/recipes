// Every recipe lives in its own file, src/recipes/<id>.json, so adding one never touches
// another and two add-recipe PRs can't conflict. Vite bundles them all at build time.
const modules = import.meta.glob('./*.json', { eager: true, import: 'default' });

const recipes = Object.values(modules).sort((a, b) => a.name.localeCompare(b.name));

export default recipes;
