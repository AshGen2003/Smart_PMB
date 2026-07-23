/**
 * App-wide light/dark theme context. Persists the choice in localStorage
 * (`smart-pmb-theme`) and applies it as a `data-theme` attribute on
 * `<html>`, which the CSS custom properties (e.g. `var(--primary)`) key
 * off of. Used across the admin shell, farmer shell, and public auth pages.
 */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * On mount, restores the saved theme from localStorage, or falls back to
 * the OS-level `prefers-color-scheme` if the user hasn't chosen one yet.
 * This runs client-side only (after hydration) since localStorage/
 * matchMedia aren't available during server rendering.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedTheme = localStorage.getItem("smart-pmb-theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  // Flips the theme, persists the choice, and updates the <html> attribute
  // immediately so the CSS variables switch without a page reload.
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("smart-pmb-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook for consuming the theme context; throws if called outside a ThemeProvider so misuse fails loudly during development. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
