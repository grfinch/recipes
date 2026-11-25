import { useRef } from 'react';
import { hashFor } from '../../utils/recipeHash';
import { filterOptions, matchesFilters } from '../../utils/recipeFilters';
import BrowseFilters from './BrowseFilters';
import styles from './browse.module.css';
import filterStyles from './browseFilters.module.css';

// filters: { course?, method? } from the URL; onFiltersChange gets the new filters object.
// returnTo: the recipe the visitor came from, if any, for a "Back to" link above the list.
export default function BrowseRecipes({
  recipes = [],
  filters = {},
  onFiltersChange = () => {},
  returnTo = null,
}) {
  const courseAllRef = useRef(null);
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter((recipe) => matchesFilters(recipe, filters));

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
          {shown.length > 0 ? (
            <ul className={styles.list}>
              {shown.map((recipe) => {
                const details = [recipe.course, recipe.cookingMethod].filter(Boolean).join(' · ');
                return (
                  <li key={recipe.id} className={styles.item}>
                    <a href={hashFor(recipe)} className={styles.link}>
                      {recipe.name}
                    </a>
                    {details ? <span className={styles.details}>{details}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <button type="button" className={filterStyles.clear} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </>
      ) : (
        <p>No recipes yet.</p>
      )}
    </>
  );
}
