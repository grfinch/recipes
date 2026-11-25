import { useEffect, useState } from 'react';

// The visitor's theme: 'system' follows the device's light or dark setting, 'light' and 'dark'
// override it. Saved in localStorage, so it applies on every page and visit. index.html has a
// small copy of applyTheme that runs before the first paint: keep the two in step.
export const THEMES = ['system', 'light', 'dark'];
export const THEME_KEY = 'recipes:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.includes(saved) ? saved : 'system';
  } catch {
    return 'system'; // storage blocked
  }
}

function saveTheme(theme) {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage full or blocked: the theme still applies until the page is closed
  }
}

// data-theme on <html> is always 'light' or 'dark', the scheme the CSS draws (index.css).
function applyTheme(theme) {
  const systemDark = window.matchMedia?.(DARK_QUERY).matches ?? false;
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

// [theme, setTheme]. While the theme is 'system', a change to the device's setting applies at
// once. A choice made in another tab applies here too.
export default function useTheme() {
  const [theme, setThemeState] = useState(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return undefined;
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return undefined;
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    function onStorage(event) {
      if (event.key === THEME_KEY || event.key === null) setThemeState(loadTheme());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function setTheme(next) {
    setThemeState(next);
    saveTheme(next);
  }

  return [theme, setTheme];
}
