
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
        <li className={`${styles.li_no_bullets} ${checked ? styles.checked : ''}`}>
            {/* No aria-label: it would replace the visible text, so screen readers would
                hear "Toggle item 3" instead of the step. The name comes from the content. */}
            <div //TODO: change this to a label?
                role="button"
                tabIndex={0}
                aria-pressed={!!checked}
                onClick={toggle}
                onKeyDown={onKeyDown}
                className={styles.label}
            >
                {/* The ✓ is decorative; aria-pressed already says whether it's done */}
                <span className={`${styles.numberBtn} ${checked ? styles.checkMark : ''}`}>
                    {checked ? <span aria-hidden="true">✓</span> : `${index}.`}
                </span>
                <span>{item}</span>
            </div>
        </li>
    );
}