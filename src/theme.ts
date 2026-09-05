const KEY = "public-cameras:theme";

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const color = theme === "dark" ? "#07080a" : "#f4f1ea";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, next);
  applyTheme(next);
  return next;
}

export function initTheme(): Theme {
  const theme = getTheme();
  applyTheme(theme);
  return theme;
}
