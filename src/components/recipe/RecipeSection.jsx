import styles from './recipe.module.css';
import CheckboxItem from '../listItems/CheckboxItem';
import Divider from '../listItems/Divider';
import BulletItem from '../listItems/BulletItem';
import NumberedClickableItem from '../listItems/NumberedClickableItem';

export default function RecipeSection({ header, listItems, ordered, clickable }) {
    // Normalize listItems into an array of groups (array of arrays).
    // Accept either:
    // - grouped input: [['1 cup flour', ...], ['other group', ...]]
    // - flat input: ['1 cup flour', '---', '1 tsp salt', ...] (split on items that start with '-')
    const groups = Array.isArray(listItems) && listItems.length > 0 && Array.isArray(listItems[0])
        ? listItems
        : (Array.isArray(listItems) ? splitFlatNotes(listItems) : [])

    function renderListItem(item, iIdx, gIdx) {
        // Position-based key: item text can repeat (e.g. "1 tsp salt" twice). The list
        // never reorders, and App remounts Recipe per recipe, so position is stable.
        const key = `${gIdx}-${iIdx}`;
        if (!ordered && clickable) return <CheckboxItem key={key} item={item} />;
        if (ordered && clickable) return <NumberedClickableItem key={key} item={item} index={iIdx + 1} />;
        return <BulletItem key={key} item={item} />;
    }

    return (<>
        <h2>{header}</h2>
        <ul className={styles.list_no_bullets}>
            {groups.map((group, gIdx) => {
                const items = group.map(
                    (item, iIdx) => renderListItem(item, iIdx, gIdx)
                );

                if (gIdx < groups.length - 1) {
                    items.push(
                        <Divider key={`divider-${gIdx}`} />
                    )
                }

                return items
            })}
        </ul>
    </>)
}

function splitFlatNotes(flat) {
    const groups = []
    let current = []
    flat.forEach(item => {
        // treat any string starting with '-' as a separator
        if (typeof item === 'string' && item.trim().startsWith('-')) {
            // end current group
            groups.push(current)
            current = []
        } else {
            current.push(item)
        }
    })
    // push remaining
    if (current.length > 0) groups.push(current)
    return groups
}

