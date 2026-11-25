import useTheme from '../../hooks/useTheme';
import styles from './theme.module.css';

const CHOICES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// The site theme setting, in the footer. Native radios: Tab reaches the checked one, arrow keys
// change it. Each label is the visible text, so it is also the accessible name.
export default function ThemePicker() {
  const [theme, setTheme] = useTheme();

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>Theme</legend>
      <div className={styles.choices}>
        {CHOICES.map(({ value, label }) => (
          <label key={value} className={styles.choice}>
            <input
              type="radio"
              name="site-theme"
              value={value}
              className={styles.input}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
