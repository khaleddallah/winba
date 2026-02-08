/**
 * ThemeSwitcher — manages dark/light theme via data-theme attribute on <html>.
 * Persists choice to localStorage.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'wm7:theme';
const ATTR = 'data-theme';

/** Apply a theme to the document and persist it. */
export function setTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.removeAttribute(ATTR);
  } else {
    document.documentElement.setAttribute(ATTR, theme);
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Get the currently active theme. */
export function getTheme(): Theme {
  return (document.documentElement.getAttribute(ATTR) as Theme) || 'dark';
}

/** Toggle between dark ↔ light. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Restore theme from localStorage (call once on app boot). */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved) {
    setTheme(saved);
  }
}
