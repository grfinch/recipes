import styles from './browseFilters.module.css';

const GROUPS = [
  { param: 'course', legend: 'Course' },
  { param: 'method', legend: 'Cooking method' },
];

// One row of radio chips per filter. Native radios: Tab reaches the checked chip, arrow keys
// change it. The chip is the input's <label>, so the visible text is its accessible name.
// name: the radio groups' name prefix, so another page (Pick for me) can reuse the chips.
export default function BrowseFilters({
  options,
  filters,
  onChange,
  courseAllRef,
  name = 'browse',
}) {
  return (
    <div className={styles.filters}>
      {GROUPS.map(({ param, legend }) => (
        <fieldset key={param} className={styles.group}>
          <legend className={styles.legend}>{legend}</legend>
          <div className={styles.chips}>
            {[null, ...options[param]].map((value) => (
              <label key={value ?? ''} className={styles.chip}>
                <input
                  type="radio"
                  name={`${name}-${param}`}
                  className={styles.input}
                  checked={(filters[param] ?? null) === value}
                  onChange={() => onChange({ ...filters, [param]: value ?? undefined })}
                  ref={param === 'course' && value === null ? courseAllRef : undefined}
                />
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
                {value ?? 'All'}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
