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
  // Steps are numbered straight through the section, not restarted in each group.
  const firstNumber = groups.map((_, g) =>
    groups.slice(0, g).reduce((count, group) => count + group.items.length, 1),
  );

  function renderListItem(item, iIdx, gIdx) {
    // Position-based key: item text can repeat (e.g. "1 tsp salt" twice). The list
    // never reorders, and App remounts Recipe per recipe, so position is stable.
    const key = `${gIdx}-${iIdx}`;
    if (!clickable) return <BulletItem key={key} item={item} />;

    const id = `${header}:${key}`;
    const props = { item, checked: checked.has(id), onToggle: () => onToggle(id) };
    return ordered ? (
      <NumberedClickableItem key={key} index={firstNumber[gIdx] + iIdx} {...props} />
    ) : (
      <CheckboxItem key={key} {...props} />
    );
  }

  return (
    <>
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
    </>
  );
}
