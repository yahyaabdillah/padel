"use client";

import React from "react";

export type ProgressColor =
  | "primary"
  | "emerald"
  | "accent"
  | "error"
  | "warning";

export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressProps {
  /** Nilai progress 0-100 */
  value: number;
  /** Warna bar terisi */
  color?: ProgressColor;
  /** Ketebalan bar */
  size?: ProgressSize;
  /** Tampilkan label persen di kanan */
  showLabel?: boolean;
  /** Efek garis bergaris (striped) */
  striped?: boolean;
  /** Class tambahan untuk container */
  className?: string;
}

export interface CircularProgressProps {
  /** Nilai progress 0-100 */
  value: number;
  /** Diameter lingkaran dalam px */
  size?: number;
  /** Ketebalan stroke dalam px */
  strokeWidth?: number;
  /** Warna ring terisi */
  color?: ProgressColor;
  /** Tampilkan persen di tengah */
  showLabel?: boolean;
  /** Class tambahan untuk container */
  className?: string;
}

// Map warna ke CSS variable / token Tailwind status
const colorVar: Record<ProgressColor, string> = {
  primary: "var(--color-primary)",
  emerald: "var(--color-emerald)",
  accent: "var(--color-accent)",
  error: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const trackHeight: Record<ProgressSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

/**
 * Progress — linear progress bar dengan beberapa warna, ukuran, label & efek striped.
 */
export const Progress: React.FC<ProgressProps> = ({
  value,
  color = "primary",
  size = "md",
  showLabel = false,
  striped = false,
  className = "",
}) => {
  const pct = clamp(value);

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "relative w-full overflow-hidden rounded-full bg-[var(--surface-muted)]",
          trackHeight[size],
        ].join(" ")}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-500 ease-out",
            striped ? "bg-[length:1rem_1rem]" : "",
          ].join(" ")}
          style={{
            width: `${pct}%`,
            backgroundColor: striped ? undefined : colorVar[color],
            backgroundImage: striped
              ? `linear-gradient(45deg, ${colorVar[color]} 25%, transparent 25%, transparent 50%, ${colorVar[color]} 50%, ${colorVar[color]} 75%, transparent 75%, transparent)`
              : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-xs font-medium text-[var(--text-body)]">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
};

/**
 * CircularProgress — progress melingkar berbasis SVG, dengan label persen di tengah.
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 80,
  strokeWidth = 8,
  color = "primary",
  showLabel = true,
  className = "",
}) => {
  const pct = clamp(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className={["relative inline-flex items-center justify-center", className].join(
        " "
      )}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={strokeWidth}
        />
        {/* Indikator */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colorVar[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--text-heading)]">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
};

export default Progress;
