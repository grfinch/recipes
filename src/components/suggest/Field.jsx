import styles from './suggest.module.css';

// A label, optional hint, and inline error above one control. children gets the props that tie
// the control to them: id, aria-describedby, aria-invalid, and the shared class.
export default function Field({ id, label, optional = false, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ');
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional ? (
          <>
            {' '}
            <span className={styles.optional}>(optional)</span>
          </>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}
      {children({
        id,
        className: styles.control,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}
    </div>
  );
}
