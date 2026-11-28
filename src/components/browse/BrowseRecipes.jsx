import { Fragment, useId, useRef, useState } from 'react';
import { SUGGEST_HASH, filterValues, hashFor } from '../../utils/recipeHash';
import {
  LETTER_GROUP_THRESHOLD,
  filterOptions,
  groupByLetter,
  matchesFilters,
} from '../../utils/recipeFilters';
import { ingredientTerms, linesUsing, pickRandom, usesAll } from '../../utils/recipePick';
import BackToTop from './BackToTop';
import BrowseFilters from './BrowseFilters';
import styles from './browse.module.css';
import filterStyles from './browseFilters.module.css';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const orList = (items) => new Intl.ListFormat('en', { type: 'disjunction' }).format(items);

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

// The random pick, in a card above the list. Its link has data-recipe-id too, and comes first
// in the page, so coming Back from the pick puts focus here.
function PickCard({ recipe, terms, onlyOne }) {
  const details = [recipe.course, recipe.cookingMethod].filter(Boolean).join(' · ');
  const used = linesUsing(recipe, terms);
  return (
    <section className={styles.result} aria-labelledby="pick-result-heading">
      <h2 id="pick-result-heading" className={styles.resultHeading}>
        Your pick
      </h2>
      <p className={styles.resultName}>
        <a href={hashFor(recipe)} data-recipe-id={recipe.id}>
          {recipe.name}
        </a>
      </p>
      {details ? <p className={styles.resultDetails}>{details}</p> : null}
      {used.length > 0 ? (
        <>
          <p className={styles.usesTitle}>Uses what you have:</p>
          <ul className={styles.uses}>
            {used.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
      {onlyOne ? (
        <p className={styles.resultDetails}>It&apos;s the only recipe that matches.</p>
      ) : null}
    </section>
  );
}

// filters: { course?, method?, by?, have? } from the URL, each a list of values (have: the
// ingredients the visitor has); onFiltersChange gets the new filters object.
// returnTo: the recipe the visitor came from, if any, for a "Back to" link above the list.
// picked: the random pick, or null; onPick gets a new one. App holds it, so it's still there
// after opening the pick and coming Back. It shows only while the filters still match it.
export default function BrowseRecipes({
  recipes = [],
  filters = {},
  onFiltersChange = () => {},
  returnTo = null,
  picked = null,
  onPick = () => {},
  random = Math.random,
}) {
  const courseAllRef = useRef(null);
  const h1Ref = useRef(null);
  const headingIdPrefix = useId();

  // The ingredients box keeps the visitor's own text ("chicken, " while typing), and the URL
  // keeps its terms. When the terms change from outside (Back, an edited link, Clear filters),
  // show them instead. Adjusted during render, not in an effect.
  const have = ingredientTerms(filterValues(filters.have).join(','));
  const [ingredientsText, setIngredientsText] = useState(() => have.join(', '));
  if (ingredientTerms(ingredientsText).join(',') !== have.join(',')) {
    setIngredientsText(have.join(', '));
  }

  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter((recipe) => matchesFilters(recipe, filters) && usesAll(recipe, have));
  const current = shown.includes(picked) ? picked : null;
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

  function changeIngredients(text) {
    setIngredientsText(text);
    const { have: _old, ...rest } = filters;
    const terms = ingredientTerms(text);
    onFiltersChange(terms.length > 0 ? { ...rest, have: terms } : rest);
  }

  function clearFilters() {
    onFiltersChange({});
    // The button goes away with the empty state; carry on from the first filter's "All" chip
    courseAllRef.current?.focus();
  }

  // Ingredients no recipe uses at all, to say why nothing matches
  const unknown = have.filter((term) => !recipes.some((recipe) => usesAll(recipe, [term])));
  let count;
  if (shown.length > 0) count = plural(shown.length, 'recipe');
  else if (unknown.length > 0) count = `No recipes use ${orList(unknown)}.`;
  else count = 'No recipes match these filters.';

  return (
    <>
      {returnTo ? (
        <a href={hashFor(returnTo)} className={styles.backLink}>
          <span aria-hidden="true">←&nbsp;</span>Back to {returnTo.name}
        </a>
      ) : null}
      {/* tabIndex -1: App moves focus here after navigating */}
      <h1 ref={h1Ref} tabIndex={-1}>
        All recipes
      </h1>
      {sorted.length > 0 ? (
        <>
          <BrowseFilters
            options={filterOptions(recipes)}
            filters={filters}
            onChange={onFiltersChange}
            courseAllRef={courseAllRef}
          />
          <div className={styles.field}>
            <label htmlFor="browse-ingredients" className={styles.label}>
              Ingredients you have <span className={styles.optional}>(optional)</span>
            </label>
            <p id="browse-ingredients-hint" className={styles.hint}>
              The recipe must use all of them. Separate them with commas, like: chicken, rice
            </p>
            <input
              id="browse-ingredients"
              type="text"
              className={styles.control}
              value={ingredientsText}
              onChange={(e) => changeIngredients(e.target.value)}
              aria-describedby="browse-ingredients-hint"
              autoComplete="off"
              maxLength={200}
            />
          </div>
          {/* In <main>, separate from the search box's own role="status" in the header */}
          <p role="status" className={filterStyles.count}>
            {count}
          </p>
          {shown.length > 0 ? (
            // Focus stays on the button, so another pick is one tap
            <button
              type="button"
              className={styles.pickButton}
              onClick={() => onPick(pickRandom(shown, current, random))}
            >
              {current && shown.length > 1 ? 'Pick another' : 'Pick one for me'}
            </button>
          ) : (
            <button type="button" className={filterStyles.clear} onClick={clearFilters}>
              Clear filters
            </button>
          )}
          {/* Announces each new pick */}
          <div aria-live="polite" className={styles.pickResult}>
            {current ? (
              <PickCard recipe={current} terms={have} onlyOne={shown.length === 1} />
            ) : null}
          </div>
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
          ) : null}
        </>
      ) : (
        <p>No recipes yet.</p>
      )}
      <p className={styles.suggest}>
        Don&apos;t see a favorite? <a href={SUGGEST_HASH}>Suggest a recipe</a>
      </p>
      <BackToTop headingRef={h1Ref} />
    </>
  );
}
