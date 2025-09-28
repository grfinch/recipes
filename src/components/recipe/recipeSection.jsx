import { useEffect, useState } from 'react'
import styles from './recipe.module.css';
import CheckboxItem from '../listItems/checkboxItem';
import Divider from '../listItems/divider';
import BulletItem from '../listItems/bulletItem';
import NumberedClickableItem from '../listItems/numberedClickableItem';

export default function RecipeSection({ header, listItems, ordered, clickable }) {
    // Normalize listItems into an array of groups (array of arrays).
    // Accept either:
    // - grouped input: [['1 cup flour', ...], ['other group', ...]]
    // - flat input: ['1 cup flour', '---', '1 tsp salt', ...] (split on items that start with '-')
    const groups = Array.isArray(listItems) && listItems.length > 0 && Array.isArray(listItems[0])
        ? listItems
        : (Array.isArray(listItems) ? splitFlatNotes(listItems) : [])

    return (
        <>
            <h2>{header}</h2>
            <ul className={styles.list_no_bullets}>
                {
                    groups.map((group, gIdx) => {
                        const items = group.map((item, iIdx) => {
                            const key = `${item}-${gIdx}`
                            return (
                                !ordered && clickable ?
                                    <CheckboxItem key={key} item={item} />
                                    :
                                    ordered && clickable ?
                                        <NumberedClickableItem key={key} item={item} index={iIdx + 1} />
                                        :
                                        <BulletItem key={key} item={item} />
                            )
                        })

                        if (gIdx < groups.length - 1) {
                            items.push(
                                <Divider key={`divider-${gIdx}`} />
                            )
                        }

                        return items
                    })
                }
            </ul>
        </>
    )
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

