import useCheckedItems from '../../hooks/useCheckedItems';
import { changeHashFor, hashForView } from '../../utils/recipeHash';
import RecipeSection from './RecipeSection';
import styles from './recipe.module.css';

// Each detail links to the browse page filtered by its value, e.g. every Dinner recipe
const DETAILS = [
  { key: 'course', label: 'Course', filter: 'course' },
  { key: 'cookingMethod', label: 'Cooking method', filter: 'method' },
  // Credit for whoever shared the recipe, linking to everything else they shared
  { key: 'contributor', label: 'Shared by', filter: 'by' },
];

export default function Recipe({ recipe }) {
  const { id, name, ingredients, instructions, notes } = recipe;
  const details = DETAILS.filter(({ key }) => recipe[key]);
  const [checked, toggle, reset] = useCheckedItems(id);

  return (
    <div className={styles.recipe}>
      {/* Title and buttons share a row when there's room, saving height on short screens */}
      <div className={styles.titleRow}>
        <h1 tabIndex={-1}>{name}</h1>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.print()} className={styles.actionButton}>
            Print
          </button>
          <button type="button" onClick={reset} className={styles.actionButton}>
            Reset checklist
          </button>
        </div>
      </div>
      {details.length > 0 ? (
        <dl className={styles.details}>
          {details.map(({ key, label, filter }) => (
            <div key={key} className={styles.detail}>
              <dt>{label}</dt>
              <dd>
                <a href={hashForView({ page: 'browse', [filter]: recipe[key] })}>{recipe[key]}</a>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <RecipeSection
        header={'Ingredients'}
        groups={ingredients}
        ordered={false}
        clickable={true}
        checked={checked}
        onToggle={toggle}
      />
      <RecipeSection
        header={'Instructions'}
        groups={instructions}
        ordered={true}
        clickable={true}
        checked={checked}
        onToggle={toggle}
      />
      {notes?.length > 0 ? (
        <RecipeSection header={'Notes'} groups={notes} ordered={false} clickable={false} />
      ) : null}
      <p className={styles.suggestChange}>
        Spotted a mistake, or have a tip? <a href={changeHashFor(recipe)}>Suggest a change</a>
      </p>
    </div>
  );
}
