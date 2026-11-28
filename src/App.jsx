import { useEffect, useRef, useState } from 'react';
import './App.css';
import allRecipes from './recipes/index.js';
import BrowseRecipes from './components/browse/BrowseRecipes';
import SiteFooter from './components/footer/SiteFooter';
import Recipe from './components/recipe/Recipe';
import SearchBox from './components/search/SearchBox';
import SuggestChange from './components/suggest/SuggestChange';
import SuggestRecipe from './components/suggest/SuggestRecipe';
import ThemePicker from './components/theme/ThemePicker';
import KeepScreenOn from './components/wakeLock/KeepScreenOn';
import { BROWSE_HASH, SUGGEST_HASH, hashFor, hashForView, viewFromHash } from './utils/recipeHash';

const SITE_TITLE = "Sharmi's Cook Book";
const PAGE_TITLES = {
  browse: 'All recipes',
  suggest: 'Suggest a recipe',
};

function randomRecipeView() {
  const recipe = allRecipes[Math.floor(Math.random() * allRecipes.length)];
  return recipe ? { page: 'recipe', recipe } : null;
}

// Same page or recipe, ignoring browse filters
function samePage(a, b) {
  return a?.page === b?.page && a?.recipe === b?.recipe;
}

// Same page and the same browse filters
function sameView(a, b) {
  return samePage(a, b) && (!a || hashForView(a) === hashForView(b));
}

function App() {
  // view: { page: 'browse', course?, method?, by?, have? } (each a list of values),
  // { page: 'suggest' }, { page: 'change', recipe }, or { page: 'recipe', recipe };
  // null only when there are no recipes.
  // The page in the URL hash, else a random recipe. The function form runs only on first render.
  const [view, setView] = useState(() => viewFromHash(allRecipes) ?? randomRecipeView());
  const mainRef = useRef(null);
  const shownView = useRef(view);
  const openedFromBrowse = useRef(null);

  // The last recipe shown, so All recipes can offer a way back to it after an accidental tap.
  // Updated during render (React's "adjust state when a prop changes" pattern), not in an effect.
  const [lastRecipe, setLastRecipe] = useState(view?.page === 'recipe' ? view.recipe : null);
  if (view?.page === 'recipe' && view.recipe !== lastRecipe) setLastRecipe(view.recipe);
  const returnTo = view?.page === 'browse' ? lastRecipe : null;

  // All recipes' random pick. Kept here rather than in the page, so opening the picked recipe
  // and coming Back shows it again (the filters come back with the hash).
  const [picked, setPicked] = useState(null);

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
  // (random or unknown-hash) recipe and browse filter changes, without adding a history entry
  // or firing hashchange, so Back skips past filter taps.
  useEffect(() => {
    if (!view) return;
    const hash = hashForView(view);
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
    const pageTitle =
      view.page === 'recipe'
        ? view.recipe.name
        : view.page === 'change'
          ? `Suggest a change to ${view.recipe.name}`
          : PAGE_TITLES[view.page];
    document.title = `${pageTitle} | ${SITE_TITLE}`;
  }, [view]);

  // After navigating, move focus to the new page's h1 so keyboard and screen-reader users start
  // at the top of the new content. The first page load keeps the browser's default focus, and
  // changing a browse filter leaves focus on the filter.
  // One exception: coming back to All recipes from a recipe opened there focuses that recipe's
  // link in the list and scrolls it into view, so a long list doesn't send the visitor back to
  // the top. openedFromBrowse is that recipe; a trip to its Suggest a change page keeps it.
  useEffect(() => {
    const prev = shownView.current;
    if (prev === view) return;
    shownView.current = view;
    if (samePage(prev, view)) return;

    if (view?.page === 'recipe' && view.recipe !== openedFromBrowse.current) {
      openedFromBrowse.current = prev?.page === 'browse' ? view.recipe : null;
    }
    const cameFrom = view?.page === 'browse' ? openedFromBrowse.current : null;
    if (view?.page === 'browse') openedFromBrowse.current = null;

    // Recipe ids are lowercase letters, digits and dashes, so they need no escaping here
    const link = cameFrom && mainRef.current?.querySelector(`[data-recipe-id="${cameFrom.id}"]`);
    if (link) {
      link.focus({ preventScroll: true });
      link.scrollIntoView?.({ block: 'start' });
    } else {
      mainRef.current?.querySelector('h1')?.focus();
    }
  }, [view]);

  function handleSelect(recipe) {
    const next = { page: 'recipe', recipe };
    // A new history entry, so Back returns to the previous page
    if (window.location.hash !== hashForView(next)) window.location.hash = hashForView(next);
    setView((prev) => (sameView(prev, next) ? prev : next));
  }

  function handleFiltersChange(filters) {
    const next = { page: 'browse', ...filters };
    // A filter change drops the pick: it may no longer fit
    setPicked(null);
    setView((prev) => (sameView(prev, next) ? prev : next));
  }

  const { page: _page, ...browseFilters } = view?.page === 'browse' ? view : {};

  return (
    <>
      <header className="siteHeader">
        {/* Site name, not a heading: each page has its own h1 */}
        <p className="siteTitle">{SITE_TITLE}</p>
        <div className="headerSearch">
          <SearchBox recipes={allRecipes} onSelect={handleSelect} />
        </div>
        {/* After the search box in the source, so Tab follows the wide layout; on phones the CSS
            shows it beside the site title instead */}
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
        {/* Display settings: Keep screen on and the theme button, on one line */}
        <div className="headerSettings">
          <KeepScreenOn />
          <ThemePicker />
        </div>
      </header>

      <main ref={mainRef}>
        {view?.page === 'browse' ? (
          <BrowseRecipes
            recipes={allRecipes}
            filters={browseFilters}
            onFiltersChange={handleFiltersChange}
            returnTo={returnTo}
            picked={picked}
            onPick={setPicked}
          />
        ) : view?.page === 'suggest' ? (
          <SuggestRecipe />
        ) : view?.page === 'change' ? (
          // key: another recipe's change page starts from that recipe's own draft
          <SuggestChange key={view.recipe.id} recipe={view.recipe} />
        ) : view ? (
          // key: a new recipe remounts, so its own saved checklist loads
          <Recipe key={view.recipe.id} recipe={view.recipe} />
        ) : (
          <p>
            No recipes yet. <a href={SUGGEST_HASH}>Suggest a recipe</a>
          </p>
        )}
      </main>
      <SiteFooter page={view?.page} />
    </>
  );
}

export default App;
