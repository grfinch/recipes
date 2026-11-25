import styles from './recipe.module.css';
import CheckboxItem from '../listItems/CheckboxItem';
import BulletItem from '../listItems/BulletItem';
import NumberedClickableItem from '../listItems/NumberedClickableItem';

// groups: [{ title?, items: [string] }], as in the recipe files.
// checked: Set of checked item ids; onToggle(id) flips one. Ids are `${header}:${group}-${item}`.
export default function RecipeSection({
  header,
  groups = [],
  ordered,
  clickable,
  checked = new Set(),
  onToggle = () => {},
}) {
  function renderListItem(item, iIdx, gIdx) {
    // Position-based key: item text can repeat (e.g. "1 tsp salt" twice). The list
    // never reorders, and App remounts Recipe per recipe, so position is stable.
    const key = `${gIdx}-${iIdx}`;
    if (!clickable) return <BulletItem key={key} item={item} />;

    const id = `${header}:${key}`;
    const props = { item, checked: checked.has(id), onToggle: () => onToggle(id) };
    return ordered ? (
      // Numbering restarts at 1 in each group (each stage, like "Sauté" or "Pressure cook")
      <NumberedClickableItem key={key} index={iIdx + 1} {...props} />
    ) : (
      <CheckboxItem key={key} {...props} />
    );
  }

  return (
    <section className={styles.section}>
      <h2>{header}</h2>
      {groups.map((group, gIdx) => (
        // Titled groups get a heading; untitled ones a decorative rule (CSS) to set them apart
        <div key={gIdx} className={group.title ? styles.group : styles.untitledGroup}>
          {group.title ? <h3 className={styles.groupTitle}>{group.title}</h3> : null}
          <ul className={styles.list_no_bullets}>
            {group.items.map((item, iIdx) => renderListItem(item, iIdx, gIdx))}
          </ul>
        </div>
      ))}
    </section>
  );
}
