/**
 * App-wide English/Sinhala language context, mirroring ThemeProvider:
 * persists the choice in localStorage (`smart-pmb-language`) and applies
 * it as the `lang` attribute on `<html>`. Changing the language triggers a
 * full page reload (see setLanguage below) rather than just a context
 * update. See app/lib/translations.ts for what's actually translated —
 * the farmer portal (sidebar, dashboard, harvests, messages, profile,
 * settings) has full coverage; other portals are translated only where
 * they share a component with it (e.g. the Settings cards).
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

  // A full reload (rather than just updating context) guarantees every
  // page — including ones not yet wired up to a translations key for a
  // given string — re-renders from scratch in the new language, and any
  // server-rendered content picked up on the next request reflects it too.
  function setLanguage(lang: Language) {
    localStorage.setItem("smart-pmb-language", lang);
    document.documentElement.setAttribute("lang", lang);
    window.location.reload();
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
