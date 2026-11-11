import React, { createContext, useContext, useEffect, useState } from "react";
import type { ThemeId } from "../types/desktop";

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "intellios_theme";
const REDUCE_MOTION_KEY = "intellios_reduce_motion";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    return saved === "ubuntu-light" || saved === "kali-dark" ? saved : "ubuntu-dark";
  });

  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    const saved = localStorage.getItem(REDUCE_MOTION_KEY);
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setReduceMotion = (reduce: boolean) => {
    setReduceMotionState(reduce);
    localStorage.setItem(REDUCE_MOTION_KEY, String(reduce));
    document.documentElement.setAttribute("data-reduced-motion", String(reduce));
  };

  const toggleTheme = () => {
    const next: ThemeId =
      theme === "ubuntu-dark"
        ? "kali-dark"
        : theme === "kali-dark"
        ? "ubuntu-light"
        : "ubuntu-dark";
    setTheme(next);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-reduced-motion", String(reduceMotion));
  }, [theme, reduceMotion]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, reduceMotion, setReduceMotion, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

