import { useState } from 'react';
import styles from './listItems.module.css';

export default function NumberedClickableItem({ item, index }) {
  const [checked, setChecked] = useState(false);

  return (
    <li className={`${styles.li_no_bullets} ${checked ? styles.checked : ''}`}>
      {/* A toggle button: Enter and Space work natively, and aria-pressed says whether
          the step is done. No aria-label, so the name comes from the visible step text. */}
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => setChecked((prev) => !prev)}
        className={`${styles.label} ${styles.stepButton}`}
      >
        {/* The ✓ is decorative; aria-pressed already says whether it's done */}
        <span className={`${styles.numberBtn} ${checked ? styles.checkMark : ''}`}>
          {checked ? <span aria-hidden="true">✓</span> : `${index}.`}
        </span>
        <span>{item}</span>
      </button>
    </li>
  );
}
