"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";
import styles from "./AuthLayout.module.css";

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
