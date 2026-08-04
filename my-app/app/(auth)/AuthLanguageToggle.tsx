/**
 * Small English/Sinhala toggle button shown in the corner of the auth
 * form panel, next to AuthThemeToggle. Reads/updates the shared language
 * via the LanguageProvider context.
 */
"use client";

import React from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "./AuthLayout.module.css";

/** Renders a button showing the language to switch to; flips language on click. */
export default function AuthLanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <button
      type="button"
      className={styles.langToggle}
      onClick={() => setLanguage(language === "en" ? "si" : "en")}
      aria-label={t.toggle.languageAria}
    >
      {language === "en" ? "සිං" : "EN"}
    </button>
  );
}
