import { hashFor } from '../../utils/recipeHash';
import styles from './browse.module.css';

// returnTo: the recipe the visitor came from, if any, for a "Back to" link above the list
export default function BrowseRecipes({ recipes = [], returnTo = null }) {
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));

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
        <ul className={styles.list}>
          {sorted.map((recipe) => {
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
        <p>No recipes yet.</p>
      )}
    </>
  );
}
