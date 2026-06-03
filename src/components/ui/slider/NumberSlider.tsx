"use client";

import React, { useId } from "react";

export type NumberSliderColor = "primary" | "emerald" | "accent";

interface NumberSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (value: number) => void;
  color?: NumberSliderColor;
  label?: string;
  /** satuan ditampilkan di samping input, mis. "kg" / "cm" */
  unit?: string;
  disabled?: boolean;
  className?: string;
}

const colorVar: Record<NumberSliderColor, string> = {
  primary: "var(--color-primary)",
  emerald: "var(--color-emerald)",
  accent: "var(--color-accent)",
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * NumberSlider — slider + input angka yang tersinkron.
 * Memudahkan input nilai presisi sekaligus geser cepat.
 */
const NumberSlider: React.FC<NumberSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = "primary",
  label,
  unit,
  disabled = false,
  className = "",
}) => {
  const id = useId();
  const safe = clamp(value, min, max);
  const percent = max === min ? 0 : ((safe - min) / (max - min)) * 100;
  const fill = colorVar[color];

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange?.(Number(e.target.value));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === "") {
      onChange?.(min);
      return;
    }
    const n = Number(raw.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) onChange?.(clamp(n, min, max));
  };

  return (
    <div className={["w-full", className].join(" ")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        {label && <label htmlFor={id} className="text-sm font-medium text-[var(--text-body)]">{label}</label>}
        {/* Input angka + stepper */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-1 py-0.5">
          <button
            type="button"
            disabled={disabled || safe <= min}
            onClick={() => onChange?.(clamp(safe - step, min, max))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-caption)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)] disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={safe}
            disabled={disabled}
            onChange={handleInput}
            className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums text-[var(--text-heading)] outline-none"
          />
          {unit && <span className="pr-1 text-xs text-[var(--text-muted)]">{unit}</span>}
          <button
            type="button"
            disabled={disabled || safe >= max}
            onClick={() => onChange?.(clamp(safe + step, min, max))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-caption)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)] disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      <div className="relative flex h-5 items-center">
        <div className="absolute h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-default)]">
          <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: disabled ? "var(--color-disabled)" : fill }} />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={safe}
          disabled={disabled}
          onChange={handleSlider}
          className={`number-slider relative z-1 m-0 h-5 w-full appearance-none bg-transparent ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          style={{ ["--thumb" as string]: disabled ? "var(--color-disabled)" : fill }}
        />
        <style jsx>{`
          .number-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 18px;
            width: 18px;
            border-radius: 9999px;
            background: #fff;
            border: 2px solid var(--thumb);
            box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
            transition: box-shadow 0.2s ease, transform 0.1s ease;
          }
          .number-slider:hover::-webkit-slider-thumb {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--thumb) 18%, transparent);
          }
          .number-slider:active::-webkit-slider-thumb { transform: scale(1.1); }
          .number-slider::-moz-range-thumb {
            height: 18px;
            width: 18px;
            border-radius: 9999px;
            background: #fff;
            border: 2px solid var(--thumb);
            box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
          }
          .number-slider::-moz-range-track { background: transparent; }
        `}</style>
      </div>
    </div>
  );
};

export default NumberSlider;
