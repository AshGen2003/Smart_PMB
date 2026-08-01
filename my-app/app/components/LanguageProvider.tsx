/**
 * App-wide English/Sinhala language context, mirroring ThemeProvider:
 * persists the choice in localStorage (`smart-pmb-language`) and applies
 * it as the `lang` attribute on `<html>`. Currently wired up to the
 * landing page, the login page (and the shared AuthShell it renders
 * inside), and the Settings "Language" card — see app/lib/translations.ts
 * for what's actually translated.
 */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Translations } from "@/app/lib/translations";

export type Language = "en" | "si";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** On mount, restores the saved language from localStorage (defaults to English otherwise) — client-side only, same as ThemeProvider. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("smart-pmb-language");
    if (saved === "en" || saved === "si") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(saved);
      document.documentElement.setAttribute("lang", saved);
    }
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem("smart-pmb-language", lang);
    document.documentElement.setAttribute("lang", lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook for consuming the language context; throws if called outside a LanguageProvider so misuse fails loudly during development. */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
