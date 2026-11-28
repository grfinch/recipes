import { filterValues } from '../../utils/recipeHash';
import styles from './browseFilters.module.css';

const GROUPS = [
  { param: 'course', legend: 'Course' },
  { param: 'method', legend: 'Cooking method' },
  // Who shared the recipe; filterOptions leaves it out when no recipe credits anyone
  { param: 'by', legend: 'Shared by' },
];

// The filters with one of them set to these values; no values leaves it out ("All")
function withValues(filters, param, values) {
  const { [param]: _old, ...rest } = filters;
  return values.length > 0 ? { ...rest, [param]: values } : rest;
}

// One row of checkbox chips per filter, so a row can have several choices (Appetizer and
// Side). "All" is checked while nothing else in its row is, and checking it clears the row.
// Native checkboxes: Tab moves between chips and Space toggles one. The chip is the input's
// <label>, so the visible text is its accessible name.
// filters: { course?, method?, by? }, each a list of values; onChange gets the new filters, with
// any other keys (the ingredients) kept.
// options: { course: [...], method: [...], by?: [...] }; a row shows only when its options are
// given.
export default function BrowseFilters({ options, filters, onChange, courseAllRef }) {
  return (
    <div className={styles.filters}>
      {GROUPS.filter(({ param }) => options[param]).map(({ param, legend }) => {
        const chosen = filterValues(filters[param]);
        // Toggle one value, keeping the row's values in the order the chips show them
        const toggle = (value) =>
          options[param].filter((v) => (v === value ? !chosen.includes(v) : chosen.includes(v)));
        return (
          <fieldset key={param} className={styles.group}>
            <legend className={styles.legend}>{legend}</legend>
            <div className={styles.chips}>
              {[null, ...options[param]].map((value) => (
                <label key={value ?? ''} className={styles.chip}>
                  <input
                    type="checkbox"
                    name={`browse-${param}`}
                    className={styles.input}
                    checked={value === null ? chosen.length === 0 : chosen.includes(value)}
                    onChange={() => {
                      // "All" stays checked when clicked again; there's nothing to clear
                      if (value === null && chosen.length === 0) return;
                      onChange(withValues(filters, param, value === null ? [] : toggle(value)));
                    }}
                    ref={param === 'course' && value === null ? courseAllRef : undefined}
                  />
                  {value ?? 'All'}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
