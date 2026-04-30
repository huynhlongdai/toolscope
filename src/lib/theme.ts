const THEME_KEY = "toolscope-theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    // Respect system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    // SSR or localStorage unavailable
  }
  return "light";
}

export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Initialize theme on load
export function initTheme() {
  const theme = getStoredTheme();
  setStoredTheme(theme);
  return theme;
}
