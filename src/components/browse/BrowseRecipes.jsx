import { SUGGEST_HASH, hashFor } from '../../utils/recipeHash';
import styles from './browse.module.css';

export default function BrowseRecipes({ recipes = [] }) {
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
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
      <p className={styles.suggest}>
        Don&apos;t see a favorite? <a href={SUGGEST_HASH}>Suggest a recipe</a>
      </p>
    </>
  );
}
