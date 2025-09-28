
import { useState } from 'react';
import styles from './listItems.module.css';

export default function NumberedClickableItem({ item, index }) {
    const [checked, setChecked] = useState(false);

    function toggle() {
        setChecked(prev => !prev);
    }

    // Clickable row that acts like a toggle (accessible via keyboard)
    function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
        }
    }

    return (
        <li className={`${styles.li_no_bullets} ${checked ? styles.done : ''}`}>
            <div
                role="button"
                tabIndex={0}
                aria-pressed={!!checked}
                aria-label={`Toggle item ${index}`}
                onClick={toggle}
                onKeyDown={onKeyDown}
                className={styles.label}
            >
                <span className={`${styles.numberBtn} ${checked ? styles.numberChecked : ''}`}>
                    {checked ? '✓' : `${index}.`}
                </span>
                <span>{item}</span>
            </div>
        </li>
    );
}