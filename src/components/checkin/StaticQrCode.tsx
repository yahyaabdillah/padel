"use client";

import React, { useMemo } from "react";

/**
 * StaticQrCode — a deterministic faux-QR rendered purely from a string (no
 * external dependency). It is NOT a scannable QR; it's a stable visual stand-in
 * for the dummy check-in flow. Same text -> same pattern.
 */
const StaticQrCode: React.FC<{ text: string; size?: number; className?: string }> = ({
  text,
  size = 200,
  className = "",
}) => {
  const cells = 21; // classic QR module count vibe

  // Deterministic bit grid from a simple string hash (no randomness).
  const grid = useMemo(() => {
    const bits: boolean[] = [];
    let h = 2166136261;
    for (let i = 0; i < cells * cells; i++) {
      // fold the char codes + index into the hash (FNV-ish, deterministic)
      const c = text.charCodeAt(i % text.length) || 17;
      h ^= c + i * 31;
      h = (h * 16777619) >>> 0;
      bits.push((h & 8) !== 0);
    }
    return bits;
  }, [text]);

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0);
  };
  const finderOn = (r: number, c: number) => {
    const local = (br: number, bc: number) => {
      const rr = r - br;
      const cc = c - bc;
      if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true; // ring
      if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true; // center
      return false;
    };
    if (r < 7 && c < 7) return local(0, 0);
    if (r < 7 && c >= cells - 7) return local(0, cells - 7);
    if (r >= cells - 7 && c < 7) return local(cells - 7, 0);
    return false;
  };

  return (
    <div
      className={`inline-grid rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 ${className}`}
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${cells}, 1fr)`,
        gridTemplateRows: `repeat(${cells}, 1fr)`,
        gap: 1,
      }}
      aria-label={`QR check-in code ${text}`}
      role="img"
    >
      {grid.map((on, i) => {
        const r = Math.floor(i / cells);
        const c = i % cells;
        const finder = isFinder(r, c);
        const filled = finder ? finderOn(r, c) : on;
        return (
          <span
            key={i}
            style={{ background: filled ? "var(--color-ink, #0E1116)" : "transparent" }}
            className="rounded-[1px]"
          />
        );
      })}
    </div>
  );
};

export default StaticQrCode;
