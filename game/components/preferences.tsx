"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { translate, type Language } from "@/lib/translations";
export type Theme = "light" | "dark";
interface Preferences {
  language: Language;
  theme: Theme;
  advanced: boolean;
  setAdvanced: (v: boolean) => void;
  setLanguage: (v: Language) => void;
  setTheme: (v: Theme) => void;
  t: (v: string) => string;
}
const Context = createContext<Preferences | null>(null);
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState<Language>("en"),
    [theme, setTheme] = useState<Theme>("light"),
    [advanced, setAdvanced] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setLanguage(
        localStorage.getItem("chowka-bara:language") === "kn" ? "kn" : "en",
      );
      setAdvanced(localStorage.getItem("chowka-bara:advanced") === "true");
      const saved = localStorage.getItem("chowka-bara:theme");
      setTheme(
        saved === "dark" ||
          (saved !== "light" &&
            matchMedia("(prefers-color-scheme: dark)").matches)
          ? "dark"
          : "light",
      );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#15221e" : "#f7f5ee");
    try {
      localStorage.setItem("chowka-bara:language", language);
      localStorage.setItem("chowka-bara:theme", theme);
      localStorage.setItem("chowka-bara:advanced", String(advanced));
    } catch {}
  }, [language, theme, ready, advanced]);
  const t = useCallback((v: string) => translate(v, language), [language]);
  return (
    <Context.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        advanced,
        setAdvanced,
        t,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("PreferencesProvider is missing");
  return value;
}
