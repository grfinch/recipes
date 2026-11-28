import { Fragment, useId, useRef } from 'react';
import { PICK_HASH, SUGGEST_HASH, hashFor } from '../../utils/recipeHash';
import {
  LETTER_GROUP_THRESHOLD,
  filterOptions,
  groupByLetter,
  matchesFilters,
} from '../../utils/recipeFilters';
import BrowseFilters from './BrowseFilters';
import styles from './browse.module.css';
import filterStyles from './browseFilters.module.css';

// A list of recipe links. data-recipe-id lets App put focus back on this link when the visitor
// returns from the recipe, so a long list doesn't send them back to the top.
function RecipeList({ recipes }) {
  return (
    <ul className={styles.list}>
      {recipes.map((recipe) => {
        const details = [recipe.course, recipe.cookingMethod].filter(Boolean).join(' · ');
        return (
          <li key={recipe.id} className={styles.item}>
            <a href={hashFor(recipe)} className={styles.link} data-recipe-id={recipe.id}>
              {recipe.name}
            </a>
            {details ? <span className={styles.details}>{details}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

// filters: { course?, method?, by? } from the URL, each a list of values; onFiltersChange gets the new filters object.
// returnTo: the recipe the visitor came from, if any, for a "Back to" link above the list.
export default function BrowseRecipes({
  recipes = [],
  filters = {},
  onFiltersChange = () => {},
  returnTo = null,
}) {
  const courseAllRef = useRef(null);
  const headingIdPrefix = useId();
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter((recipe) => matchesFilters(recipe, filters));
  // A long list gets A-Z sections and a jump bar; a short one stays a single plain list
  const sections = shown.length > LETTER_GROUP_THRESHOLD ? groupByLetter(shown) : null;
  const headingId = (letter) => `${headingIdPrefix}-letter-${letter === '#' ? 'other' : letter}`;

  // Buttons, not #letter links: the hash is the page's address. Focus the section's heading so
  // keyboard and screen-reader users carry on from there.
  function jumpTo(letter) {
    const heading = document.getElementById(headingId(letter));
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: 'start' });
  }

  function clearFilters() {
    onFiltersChange({});
    // The button goes away with the empty state; carry on from the first filter's "All" chip
    courseAllRef.current?.focus();
  }

  return (
    <>
      {returnTo ? (
        <a href={hashFor(returnTo)} className={styles.backLink}>
          <span aria-hidden="true">←&nbsp;</span>Back to {returnTo.name}
        </a>
      ) : null}
      {/* tabIndex -1: App moves focus here after navigating */}
      <h1 tabIndex={-1}>All recipes</h1>
      {sorted.length > 0 ? (
        <>
          <p className={styles.pick}>
            Can&apos;t decide? <a href={PICK_HASH}>Pick a recipe for me</a>
          </p>
          <BrowseFilters
            options={filterOptions(recipes)}
            filters={filters}
            onChange={onFiltersChange}
            courseAllRef={courseAllRef}
          />
          {/* In <main>, separate from the search box's own role="status" in the header */}
          <p role="status" className={filterStyles.count}>
            {shown.length === 0
              ? 'No recipes match these filters.'
              : `${shown.length} recipe${shown.length === 1 ? '' : 's'}`}
          </p>
          {sections ? (
            <>
              <nav aria-label="Jump to letter">
                <ul className={styles.jumpBar}>
                  {sections.map(({ letter }) => (
                    <li key={letter}>
                      <button
                        type="button"
                        className={styles.jumpButton}
                        onClick={() => jumpTo(letter)}
                      >
                        {letter}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              {sections.map(({ letter, recipes: inSection }) => (
                // A Fragment, not a <section>: 26 extra landmarks would crowd the landmark list
                <Fragment key={letter}>
                  {/* tabIndex -1: the jump bar moves focus here */}
                  <h2 id={headingId(letter)} tabIndex={-1} className={styles.letterHeading}>
                    {letter}
                  </h2>
                  <RecipeList recipes={inSection} />
                </Fragment>
              ))}
            </>
          ) : shown.length > 0 ? (
            <RecipeList recipes={shown} />
          ) : (
            <button type="button" className={filterStyles.clear} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </>
      ) : (
        <p>No recipes yet.</p>
      )}
      <p className={styles.suggest}>
        Don&apos;t see a favorite? <a href={SUGGEST_HASH}>Suggest a recipe</a>
      </p>
    </>
  );
}
