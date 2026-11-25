import styles from './listItems.module.css';

export default function NumberedClickableItem({ item, index, checked, onToggle }) {
  return (
    <li className={`${styles.li_no_bullets} ${checked ? styles.checked : ''}`}>
      {/* A toggle button: Enter and Space work natively, and aria-pressed says whether
          the step is done. No aria-label, so the name comes from the visible step text. */}
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className={`${styles.label} ${styles.stepButton}`}
      >
        {/* The ✓ is decorative; aria-pressed already says whether it's done. A printout always
            shows the step number (the printOnly span is display: none on screen). */}
        <span className={`${styles.numberBtn} ${checked ? styles.checkMark : ''}`}>
          {checked ? (
            <>
              <span aria-hidden="true" className={styles.screenOnly}>
                ✓
              </span>
              <span className={styles.printOnly}>{index}.</span>
            </>
          ) : (
            `${index}.`
          )}
        </span>
        <span className={styles.itemText}>{item}</span>
      </button>
    </li>
  );
}
