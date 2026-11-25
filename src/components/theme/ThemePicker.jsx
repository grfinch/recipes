import { useEffect, useId, useRef, useState } from 'react';
import useTheme from '../../hooks/useTheme';
import styles from './theme.module.css';

const CHOICES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// The site theme setting, in the header beside Keep screen on. The header shares one row with
// the search box on wide and kitchen screens, so this is a compact 44px button that shows or
// hides a small panel with a "Theme" radio group (a disclosure, not a menu: Tab moves from the
// button into the panel). Escape, a tap outside, or moving focus elsewhere closes it; Escape
// returns focus to the button. The button's name is visually hidden text, so it is read as
// "Theme"; the icon is decorative.
export default function ThemePicker() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => !rootRef.current?.contains(event.target);
    const close = (event) => {
      if (outside(event)) setOpen(false);
    };
    // Escape closes, and brings focus back to the button if it was in the panel
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    // focusin, not blur: a tap on a radio's label can blur the button first in some browsers
    document.addEventListener('pointerdown', close);
    document.addEventListener('focusin', close);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('focusin', close);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={panelId}
        title="Theme"
        onClick={() => setOpen((o) => !o)}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </svg>
        <span className="visuallyHidden">Theme</span>
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Theme</legend>
          {CHOICES.map(({ value, label }) => (
            <label key={value} className={styles.choice}>
              <input
                type="radio"
                name="site-theme"
                value={value}
                className={styles.radio}
                checked={theme === value}
                onChange={() => setTheme(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
