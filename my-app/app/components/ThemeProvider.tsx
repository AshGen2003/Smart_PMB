/**
 * App-wide light/dark theme context. Persists the choice in localStorage
 * (`smart-pmb-theme`) and applies it as a `data-theme` attribute on
 * `<html>`, which the CSS custom properties (e.g. `var(--primary)`) key
 * off of. Used across the admin shell, farmer shell, and public auth pages.
 */
"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_CHANGE_EVENT = "smart-pmb-theme-change";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * The browser preference is an external store, so useSyncExternalStore keeps
 * server rendering deterministic while restoring localStorage/system theme
 * after hydration without a synchronous state update from an effect.
 */
function subscribeTheme(listener: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  mediaQuery.addEventListener("change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    mediaQuery.removeEventListener("change", listener);
  };
}

function getThemeSnapshot(): Theme {
  const savedTheme = localStorage.getItem("smart-pmb-theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

/** Restores the saved theme, or follows the OS preference if no choice is saved. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Flips the theme, persists the choice, and updates the <html> attribute
  // immediately so the CSS variables switch without a page reload.
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem("smart-pmb-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook for consuming the theme context; throws if called outside a ThemeProvider so misuse fails during development. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
