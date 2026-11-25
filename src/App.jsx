import { useEffect, useRef, useState } from 'react';
import './App.css';
import allRecipes from './recipes/index.js';
import BrowseRecipes from './components/browse/BrowseRecipes';
import SiteFooter from './components/footer/SiteFooter';
import Recipe from './components/recipe/Recipe';
import SearchBox from './components/search/SearchBox';
import KeepScreenOn from './components/wakeLock/KeepScreenOn';
import { BROWSE_HASH, hashFor, hashForView, viewFromHash } from './utils/recipeHash';

const SITE_TITLE = "Twig's Cook Book";

function randomRecipeView() {
  const recipe = allRecipes[Math.floor(Math.random() * allRecipes.length)];
  return recipe ? { page: 'recipe', recipe } : null;
}

function sameView(a, b) {
  return a?.page === b?.page && a?.recipe === b?.recipe;
}

function App() {
  // view: { page: 'browse' } or { page: 'recipe', recipe }; null only when there are no recipes.
  // The page in the URL hash, else a random recipe. The function form runs only on first render.
  const [view, setView] = useState(() => viewFromHash(allRecipes) ?? randomRecipeView());
  const mainRef = useRef(null);
  const shownView = useRef(view);

  // The last recipe shown, so All recipes can offer a way back to it after an accidental tap.
  // Updated during render (React's "adjust state when a prop changes" pattern), not in an effect.
  const [lastRecipe, setLastRecipe] = useState(view?.page === 'recipe' ? view.recipe : null);
  if (view?.page === 'recipe' && view.recipe !== lastRecipe) setLastRecipe(view.recipe);
  const returnTo = view?.page === 'browse' ? lastRecipe : null;

  // Back/forward, header and browse links, and edited links change the hash: show that page.
  useEffect(() => {
    function onHashChange() {
      const next = viewFromHash(allRecipes);
      if (next) setView((prev) => (sameView(prev, next) ? prev : next));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the address bar and tab title on the shown page. replaceState covers the first
  // (random or unknown-hash) recipe without adding a history entry or firing hashchange.
  useEffect(() => {
    if (!view) return;
    const hash = hashForView(view);
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
    const pageTitle = view.page === 'browse' ? 'All recipes' : view.recipe.name;
    document.title = `${pageTitle} | ${SITE_TITLE}`;
  }, [view]);

  // After navigating, move focus to the new page's h1 so keyboard and screen-reader users start
  // at the top of the new content. The first page load keeps the browser's default focus.
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    mainRef.current?.querySelector('h1')?.focus();
  }, [view]);

  function handleSelect(recipe) {
    const next = { page: 'recipe', recipe };
    // A new history entry, so Back returns to the previous page
    if (window.location.hash !== hashForView(next)) window.location.hash = hashForView(next);
    setView((prev) => (sameView(prev, next) ? prev : next));
  }

  return (
    <>
      <header className="siteHeader">
        {/* Site name, not a heading: each page has its own h1 */}
        <p className="siteTitle">{SITE_TITLE}</p>
        <nav className="siteNav" aria-label="Site">
          {/* On All recipes, tapping the highlighted pill again goes back to the last recipe.
              The name stays the visible "All recipes"; screen readers hear where it goes as its
              description. */}
          <a
            href={returnTo ? hashFor(returnTo) : BROWSE_HASH}
            className="navLink"
            aria-current={view?.page === 'browse' ? 'page' : undefined}
            aria-describedby={returnTo ? 'nav-return-to' : undefined}
          >
            All recipes
          </a>
          {returnTo ? (
            <span id="nav-return-to" className="visuallyHidden">
              Back to {returnTo.name}
            </span>
          ) : null}
        </nav>
        <div className="headerSearch">
          <SearchBox recipes={allRecipes} onSelect={handleSelect} />
        </div>
        <div className="headerWake">
          <KeepScreenOn />
        </div>
      </header>

      <main ref={mainRef}>
        {view?.page === 'browse' ? (
          <BrowseRecipes recipes={allRecipes} returnTo={returnTo} />
        ) : view ? (
          // key: a new recipe remounts, so its own saved checklist loads
          <Recipe key={view.recipe.id} recipe={view.recipe} />
        ) : (
          <p>No recipes yet.</p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

export default App;
