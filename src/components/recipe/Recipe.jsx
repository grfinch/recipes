import useCheckedItems from '../../hooks/useCheckedItems';
import RecipeSection from './RecipeSection';
import styles from './recipe.module.css';

export default function Recipe({ recipe: { name, ingredients, instructions, notes } }) {
  const [checked, toggle, reset] = useCheckedItems(name);

  return (
    <>
      <h1 tabIndex={-1}>{name}</h1>
      <button type="button" onClick={reset} className={styles.resetButton}>
        Reset checklist
      </button>
      <RecipeSection
        header={'Ingredients'}
        listItems={ingredients}
        ordered={false}
        clickable={true}
        checked={checked}
        onToggle={toggle}
      />
      <RecipeSection
        header={'Instructions'}
        listItems={instructions}
        ordered={true}
        clickable={true}
        checked={checked}
        onToggle={toggle}
      />
      {notes?.length > 0 ? (
        <RecipeSection header={'Notes'} listItems={notes} ordered={false} clickable={false} />
      ) : null}
    </>
  );
}
