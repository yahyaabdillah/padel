"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect, useCallback } from "react";
import { brandPresets, type BrandPreset } from "@/data/padel/platform/settings";
import {
  getMyAppearanceAction,
  updateMyAppearanceAction,
} from "@/app/preferences/actions";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  /** active brand-preset id (see brandPresets); default "padelhub" */
  paletteId: string;
  /** switch palette: applies CSS vars to :root live + persists */
  setPalette: (id: string) => void;
  /** the resolved preset object for the active paletteId */
  palette: BrandPreset;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "theme";
const PALETTE_KEY = "padelhub-palette";
const DEFAULT_PALETTE = "padelhub";

/* ── colour math (no deps) ─────────────────────────────────────────── */

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** rgba() string from a hex + alpha (0..1). */
function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten (pct > 0) or darken (pct < 0) a hex by a percentage of the channel. */
function shade(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = pct / 100;
  const adj = (c: number) => (f < 0 ? c * (1 + f) : c + (255 - c) * f);
  return rgbToHex(adj(r), adj(g), adj(b));
}

/**
 * Write a preset's tokens onto document.documentElement as inline custom
 * properties. Inline :root vars override stylesheet :root, and persist across
 * the .dark class toggle (which only swaps non-palette surface/text tokens), so
 * the chosen brand colours hold in both light and dark modes.
 */
function applyPalette(p: BrandPreset) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;

  // Primary
  root.setProperty("--color-primary", p.primary);
  root.setProperty("--color-primary-hover", shade(p.primary, -8));
  root.setProperty("--color-primary-light", hexToRgba(p.primary, 0.12));

  // Secondary
  root.setProperty("--color-secondary", p.secondary);
  root.setProperty("--color-secondary-hover", shade(p.secondary, -8));
  root.setProperty("--color-secondary-light", hexToRgba(p.secondary, 0.14));

  // Accent
  root.setProperty("--color-accent", p.accent);
  root.setProperty("--color-accent-hover", shade(p.accent, -8));
  root.setProperty("--color-accent-light", hexToRgba(p.accent, 0.14));

  // Focus ring + glows derived from the new primary/accent.
  root.setProperty("--focus-ring", `0 0 0 4px ${hexToRgba(p.primary, 0.18)}`);
  root.setProperty("--shadow-focus-ring", `0px 0px 0px 4px ${hexToRgba(p.primary, 0.18)}`);
  root.setProperty("--glow-primary", `0 0 16px ${hexToRgba(p.primary, 0.28)}`);
  root.setProperty("--glow-primary-lg", `0 0 28px ${hexToRgba(p.primary, 0.34)}`);
  root.setProperty("--glow-accent", `0 0 16px ${hexToRgba(p.accent, 0.4)}`);

  // Reflect for any [data-palette] CSS hooks + debugging.
  document.documentElement.setAttribute("data-palette", p.id);
}

const presetById = (id: string): BrandPreset =>
  brandPresets.find((p) => p.id === id) ?? brandPresets[0];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [paletteId, setPaletteId] = useState<string>(DEFAULT_PALETTE);
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Hydrate persisted theme + palette (SSR-safe: read after mount).
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const localTheme = savedTheme === "dark" ? "dark" : "light";
      setTheme(localTheme);

      const savedPalette = window.localStorage.getItem(PALETTE_KEY);
      const resolved = savedPalette && brandPresets.some((p) => p.id === savedPalette)
        ? savedPalette
        : DEFAULT_PALETTE;
      setPaletteId(resolved);
      applyPalette(presetById(resolved));
      void getMyAppearanceAction()
        .then((stored) => {
          if (!stored) return;
          setTheme(stored.theme);
          setPaletteId(stored.paletteId);
          applyPalette(presetById(stored.paletteId));
        })
        .finally(() => setIsThemeReady(true));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Persist + apply theme (light/dark) class.
  useEffect(() => {
    if (!isThemeReady) return;
    window.localStorage.setItem(THEME_KEY, theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isThemeReady, theme]);

  // Re-apply palette vars when paletteId changes (e.g. live from settings page).
  useEffect(() => {
    if (!isThemeReady) return;
    applyPalette(presetById(paletteId));
    window.localStorage.setItem(PALETTE_KEY, paletteId);
  }, [isThemeReady, paletteId]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      void updateMyAppearanceAction({ theme: next, paletteId });
      return next;
    });
  }, [paletteId]);

  const setPalette = useCallback((id: string) => {
    if (!brandPresets.some((p) => p.id === id)) return;
    setPaletteId(id);
    // Apply immediately so the change is instant even before the effect runs.
    applyPalette(presetById(id));
    void updateMyAppearanceAction({ theme, paletteId: id });
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        paletteId,
        setPalette,
        palette: presetById(paletteId),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
