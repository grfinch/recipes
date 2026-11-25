import { useEffect, useState } from 'react';
import './App.css';
import recipesData from './recipes.json';
import Recipe from './components/recipe/Recipe';
import SearchBox from './components/search/SearchBox';
import KeepScreenOn from './components/wakeLock/KeepScreenOn';
import { hashFor, recipeFromHash } from './utils/recipeHash';

const allRecipes = Array.isArray(recipesData?.recipes) ? recipesData.recipes : [];
const SITE_TITLE = "Twig's Cook Book";

function App() {
  // The recipe in the URL hash, else a random one. The function form runs only on the first render.
  const [selected, setSelected] = useState(
    () =>
      recipeFromHash(allRecipes) ??
      allRecipes[Math.floor(Math.random() * allRecipes.length)] ??
      null,
  );

  // Back/forward and edited links change the hash: show the recipe it names.
  useEffect(() => {
    function onHashChange() {
      const recipe = recipeFromHash(allRecipes);
      if (recipe) setSelected(recipe);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the address bar and tab title on the shown recipe. replaceState covers the first
  // (random or unknown-hash) recipe without adding a history entry or firing hashchange.
  useEffect(() => {
    if (!selected) return;
    const hash = hashFor(selected);
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
    document.title = `${selected.name} | ${SITE_TITLE}`;
  }, [selected]);

  function handleSelect(recipe) {
    // A new history entry, so Back returns to the previous recipe
    if (window.location.hash !== hashFor(recipe)) window.location.hash = hashFor(recipe);
    setSelected(recipe);
  }

  return (
    <>
      <header>
        <SearchBox recipes={allRecipes} onSelect={handleSelect} />
        <KeepScreenOn />
      </header>

      <main>
        {selected ? (
          // key: a new recipe remounts, so its own saved checklist loads
          <Recipe key={selected.name} recipe={selected} />
        ) : (
          <p>No recipes yet.</p>
        )}
      </main>
    </>
  );
}

export default App;
