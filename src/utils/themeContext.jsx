// src/utils/themeContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_KEY = "theme_pref"; // "light" | "dark" | "system"

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(pref) {
  if (typeof document === "undefined") return;

  const effective = pref === "system" ? getSystemTheme() : pref;
  const root = document.documentElement;

  // Global switch (Tailwind-style or your own CSS)
  root.classList.toggle("dark", effective === "dark");

  // Optional attrs (useful for CSS variables/debug)
  root.setAttribute("data-theme", effective);
  root.setAttribute("data-theme-pref", pref);
}

export function ThemeProvider({ children }) {
  const [themePref, setThemePref] = useState("dark");

  // Load saved preference once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemePref(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Apply + persist whenever it changes
  useEffect(() => {
    applyTheme(themePref);
    try {
      localStorage.setItem(THEME_KEY, themePref);
    } catch {
      // ignore
    }
  }, [themePref]);

  // If user chose "system", react to OS theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const onChange = () => {
      if (themePref === "system") applyTheme("system");
    };

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [themePref]);

  const value = useMemo(() => ({ themePref, setThemePref }), [themePref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
