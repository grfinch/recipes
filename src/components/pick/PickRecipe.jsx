import { useRef } from 'react';
import { filterOptions, matchesFilters } from '../../utils/recipeFilters';
import { hashFor } from '../../utils/recipeHash';
import {
  NO_CHOICES,
  ingredientTerms,
  linesUsing,
  pickRandom,
  usesAll,
} from '../../utils/recipePick';
import BrowseFilters from '../browse/BrowseFilters';
import styles from './pick.module.css';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const orList = (items) => new Intl.ListFormat('en', { type: 'disjunction' }).format(items);

// The "Pick a recipe for me" page: narrow down by course, cooking method, and ingredients on
// hand, then get a random recipe that fits.
// choices: { filters: { course?, method? }, ingredients (the box's text), picked (a recipe or
// null) }. App holds them, so they're still there after opening the pick and coming Back.
export default function PickRecipe({
  recipes = [],
  choices = NO_CHOICES,
  onChoicesChange = () => {},
  random = Math.random,
}) {
  const courseAllRef = useRef(null);
  const { filters, ingredients, picked } = choices;
  const terms = ingredientTerms(ingredients);
  const matches = recipes
    .filter((recipe) => matchesFilters(recipe, filters) && usesAll(recipe, terms))
    .sort((a, b) => a.name.localeCompare(b.name));
  const narrowed = Object.values(filters).some(Boolean) || terms.length > 0;
  const shown = matches.includes(picked) ? picked : null;

  // Any change to the choices drops the old pick: it may no longer fit
  function changeChoices(next) {
    onChoicesChange({ ...choices, ...next, picked: null });
  }

  function pick() {
    onChoicesChange({ ...choices, picked: pickRandom(matches, shown, random) });
  }

  function clearChoices() {
    onChoicesChange(NO_CHOICES);
    // The button goes away with the "no match" message; carry on from the first "All" chip
    courseAllRef.current?.focus();
  }

  // Ingredients no recipe uses at all, to say why nothing matches
  const unknown = terms.filter((term) => !recipes.some((recipe) => usesAll(recipe, [term])));
  let count;
  if (matches.length === 0) {
    count =
      unknown.length > 0
        ? `No recipes use ${orList(unknown)}.`
        : 'No recipes match all of these. Try fewer choices.';
  } else if (!narrowed) {
    count = `${plural(matches.length, 'recipe')} to choose from`;
  } else {
    count = `${plural(matches.length, 'recipe')} ${matches.length === 1 ? 'matches' : 'match'}`;
  }

  const details = shown ? [shown.course, shown.cookingMethod].filter(Boolean).join(' · ') : '';
  const used = shown ? linesUsing(shown, terms) : [];

  return (
    <div className={styles.page}>
      {/* tabIndex -1: App moves focus here after navigating */}
      <h1 tabIndex={-1}>Pick a recipe for me</h1>
      {recipes.length === 0 ? (
        <p>No recipes yet.</p>
      ) : (
        <>
          <p className={styles.intro}>
            Can&apos;t decide what to make? Narrow it down if you like, and get a recipe at random.
          </p>
          <BrowseFilters
            name="pick"
            options={filterOptions(recipes)}
            filters={filters}
            onChange={(next) => changeChoices({ filters: next })}
            courseAllRef={courseAllRef}
          />
          <div className={styles.field}>
            <label htmlFor="pick-ingredients" className={styles.label}>
              Ingredients you have <span className={styles.optional}>(optional)</span>
            </label>
            <p id="pick-ingredients-hint" className={styles.hint}>
              The recipe must use all of them. Separate them with commas, like: chicken, rice
            </p>
            <input
              id="pick-ingredients"
              type="text"
              className={styles.control}
              value={ingredients}
              onChange={(e) => changeChoices({ ingredients: e.target.value })}
              aria-describedby="pick-ingredients-hint"
              autoComplete="off"
              maxLength={200}
            />
          </div>
          {/* In <main>, separate from the search box's own role="status" in the header */}
          <p role="status" className={styles.count}>
            {count}
          </p>
          {matches.length > 0 ? (
            <button type="button" className={styles.primaryButton} onClick={pick}>
              {shown && matches.length > 1 ? 'Pick another' : 'Pick for me'}
            </button>
          ) : (
            <button type="button" className={styles.secondaryButton} onClick={clearChoices}>
              Clear choices
            </button>
          )}
          {/* Announces each new pick; focus stays on the button, so another pick is one tap */}
          <div aria-live="polite">
            {shown ? (
              <section className={styles.result} aria-labelledby="pick-result-heading">
                <h2 id="pick-result-heading" className={styles.resultHeading}>
                  Your pick
                </h2>
                <p className={styles.resultName}>
                  <a href={hashFor(shown)}>{shown.name}</a>
                </p>
                {details ? <p className={styles.details}>{details}</p> : null}
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
                {matches.length === 1 ? (
                  <p className={styles.details}>It&apos;s the only recipe that matches.</p>
                ) : null}
              </section>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
