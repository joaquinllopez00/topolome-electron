import type { Theme } from "@/types";

/**
 * Theme handling. config.json (main process) is the source of truth, but we
 * also mirror the value to localStorage so the very first paint can apply the
 * right theme synchronously — before the async config read returns — avoiding
 * a light/dark flash on startup.
 */

const STORAGE_KEY = "topolome.theme";

/** Apply a theme to the document and remember it for next startup. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage can throw in locked-down contexts; theme still applies.
  }
}

/** Last theme we applied, for an instant first paint. Defaults to dark. */
export function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // ignore
  }
  return "dark";
}
