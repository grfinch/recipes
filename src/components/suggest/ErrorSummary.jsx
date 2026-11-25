import styles from './suggest.module.css';

// The list of problems a failed Send shows above a form. The form focuses it (summaryRef), so
// screen readers read it. problems: [{ id, message }], id being the field to focus.
export default function ErrorSummary({ problems, summaryRef, noun }) {
  if (problems.length === 0) return null;
  return (
    <div ref={summaryRef} tabIndex={-1} className={styles.summary}>
      <h2 className={styles.summaryTitle}>
        {problems.length === 1
          ? `There is 1 problem with your ${noun}`
          : `There are ${problems.length} problems with your ${noun}`}
      </h2>
      <ul className={styles.summaryList}>
        {problems.map(({ id, message }) => (
          <li key={id}>
            {/* Focus the field without changing the URL hash, which App uses for pages */}
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
