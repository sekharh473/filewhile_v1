export const THEME_KEY = 'filewhile_theme';

/**
 * Get initial theme from localStorage with default 'light'
 * @returns {'light' | 'dark'}
 */
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // localStorage might be unavailable
  }
  return 'light'; // Default is Light per user requirement
}

/**
 * Apply theme to document element and persist in localStorage
 * @param {'light' | 'dark'} theme 
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage might be blocked
  }
}
