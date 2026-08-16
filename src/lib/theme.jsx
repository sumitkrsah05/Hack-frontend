import { useEffect, useState } from "react";

const STORAGE_KEY = "ui-theme";
const THEME_COLORS = { dark: "#0A0E0F", light: "#F2F6F7" };

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
}

/** Initialize theme before first paint (called from main.jsx). */
export function initTheme() {
  applyTheme(getStoredTheme());
}

export function useTheme() {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}
