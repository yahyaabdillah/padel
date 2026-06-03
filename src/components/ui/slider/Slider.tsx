"use client";

import React, { useId } from "react";

export type SliderColor = "primary" | "emerald" | "accent";

export interface SliderProps {
  /** Nilai saat ini */
  value: number;
  /** Nilai minimum */
  min: number;
  /** Nilai maksimum */
  max: number;
  /** Langkah perubahan */
  step?: number;
  /** Callback saat nilai berubah */
  onChange?: (value: number) => void;
  /** Warna bagian terisi & thumb ring */
  color?: SliderColor;
  /** Tampilkan nilai di kanan label */
  showValue?: boolean;
  /** Label di atas slider */
  label?: string;
  /** Nonaktifkan slider */
  disabled?: boolean;
  /** Class tambahan untuk container */
  className?: string;
}

const colorVar: Record<SliderColor, string> = {
  primary: "var(--color-primary)",
  emerald: "var(--color-emerald)",
  accent: "var(--color-accent)",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Slider — range slider single-thumb.
 * Track pakai border-default, bagian terisi pakai warna pilihan,
 * thumb bulat putih dengan shadow + ring saat hover/focus. Mendukung dark mode (token-driven).
 */
const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = "primary",
  showValue = false,
  label,
  disabled = false,
  className = "",
}) => {
  const inputId = useId();
  const safeValue = clamp(value, min, max);
  const range = max - min;
  const percent = range === 0 ? 0 : ((safeValue - min) / range) * 100;
  const fillColor = colorVar[color];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange?.(Number(event.target.value));
  };

  return (
    <div className={["w-full", className].join(" ")}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-[var(--text-body)]"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-[var(--text-heading)]">
              {safeValue}
            </span>
          )}
        </div>
      )}

      <div className="relative flex h-5 items-center">
        {/* Track + fill */}
        <div className="absolute h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-default)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              backgroundColor: disabled ? "var(--color-disabled)" : fillColor,
            }}
          />
        </div>

        {/* Native input (di-style) */}
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          disabled={disabled}
          onChange={handleChange}
          className={[
            "slider-input relative z-1 m-0 h-5 w-full appearance-none bg-transparent",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
          style={
            {
              "--slider-thumb-color": disabled
                ? "var(--color-disabled)"
                : fillColor,
            } as React.CSSProperties
          }
          aria-label={label}
        />

        {/* Style thumb lewat styled-jsx scoped */}
        <style jsx>{`
          .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 18px;
            width: 18px;
            border-radius: 9999px;
            background: #ffffff;
            border: 2px solid var(--slider-thumb-color);
            box-shadow:
              0px 1px 3px 0px rgba(16, 24, 40, 0.1),
              0px 1px 2px 0px rgba(16, 24, 40, 0.06);
            transition:
              box-shadow 0.2s ease,
              transform 0.1s ease;
          }
          .slider-input:hover::-webkit-slider-thumb {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--slider-thumb-color) 18%, transparent);
          }
          .slider-input:focus {
            outline: none;
          }
          .slider-input:focus-visible::-webkit-slider-thumb {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--slider-thumb-color) 28%, transparent);
          }
          .slider-input::-webkit-slider-thumb:active {
            transform: scale(1.1);
          }
          .slider-input::-moz-range-thumb {
            height: 18px;
            width: 18px;
            border-radius: 9999px;
            background: #ffffff;
            border: 2px solid var(--slider-thumb-color);
            box-shadow:
              0px 1px 3px 0px rgba(16, 24, 40, 0.1),
              0px 1px 2px 0px rgba(16, 24, 40, 0.06);
            transition:
              box-shadow 0.2s ease,
              transform 0.1s ease;
          }
          .slider-input:hover::-moz-range-thumb {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--slider-thumb-color) 18%, transparent);
          }
          .slider-input:focus-visible::-moz-range-thumb {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--slider-thumb-color) 28%, transparent);
          }
          .slider-input::-moz-range-track {
            background: transparent;
          }
          .slider-input:disabled::-webkit-slider-thumb {
            cursor: not-allowed;
          }
          .slider-input:disabled::-moz-range-thumb {
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default Slider;
