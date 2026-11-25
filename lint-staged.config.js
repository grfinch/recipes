// Runs on the files staged for a commit (.husky/pre-commit). Fixers rewrite the files and
// lint-staged adds the fixes to the commit, so formatting never fails CI.
export default {
  '*.{js,jsx,mjs}': ['eslint --fix', 'prettier --write --ignore-unknown'],
  '*.{json,md,css,html,yml,yaml}': 'prettier --write --ignore-unknown',
  // Any recipe or category change: validate every recipe file (a function runs it once,
  // without the staged file names, because the checks span files: duplicate ids and names).
  '{src/recipes/*.json,src/recipeCategories.json}': () => 'npm run validate:recipes',
};
