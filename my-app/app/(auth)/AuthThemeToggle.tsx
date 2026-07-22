/**
 * Small light/dark theme toggle button shown in the corner of the auth
 * form panel. Reads/updates the shared theme via the ThemeProvider context.
 */
"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";
import styles from "./AuthLayout.module.css";

/** Renders a sun/moon icon button that flips the current theme when clicked. */
export default function AuthThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
