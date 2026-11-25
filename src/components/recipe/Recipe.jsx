import useCheckedItems from '../../hooks/useCheckedItems';
import RecipeSection from './RecipeSection';
import styles from './recipe.module.css';

export default function Recipe({ recipe: { id, name, ingredients, instructions, notes } }) {
  const [checked, toggle, reset] = useCheckedItems(id);

  return (
    <div className={styles.recipe}>
      {/* Title and Reset share a row when there's room, saving height on short screens */}
      <div className={styles.titleRow}>
        <h1 tabIndex={-1}>{name}</h1>
        <button type="button" onClick={reset} className={styles.resetButton}>
          Reset checklist
        </button>
      </div>
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
    </div>
  );
}
