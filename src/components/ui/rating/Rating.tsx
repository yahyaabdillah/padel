"use client";

import React, { useState } from "react";

export type RatingSize = "sm" | "md" | "lg";

export interface RatingProps {
  /** Nilai rating saat ini */
  value: number;
  /** Jumlah bintang maksimum */
  max?: number;
  /** Callback saat user memilih rating */
  onChange?: (value: number) => void;
  /** Hanya tampil, tidak bisa diubah */
  readonly?: boolean;
  /** Ukuran bintang */
  size?: RatingSize;
  /** Izinkan setengah bintang */
  allowHalf?: boolean;
  /** Warna bintang terisi (CSS color). Default: amber-500 */
  color?: string;
  /** Class tambahan untuk container */
  className?: string;
}

const sizePx: Record<RatingSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const STAR_PATH =
  "M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.6l-5.9 3.07 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z";

interface StarProps {
  /** 0 = kosong, 0.5 = setengah, 1 = penuh */
  fill: number;
  size: number;
  color: string;
  emptyColor: string;
}

const Star: React.FC<StarProps> = ({ fill, size, color, emptyColor }) => {
  const gradientId = React.useId();

  if (fill >= 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={STAR_PATH} />
      </svg>
    );
  }

  if (fill <= 0) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={emptyColor}
        stroke={emptyColor}
        strokeWidth={1}
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={STAR_PATH} />
      </svg>
    );
  }

  // Setengah bintang via linear gradient
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      strokeWidth={1}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId}>
          <stop offset="50%" stopColor={color} />
          <stop offset="50%" stopColor={emptyColor} />
        </linearGradient>
      </defs>
      <path
        d={STAR_PATH}
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
      />
    </svg>
  );
};

/**
 * Rating — bintang interaktif dengan dukungan setengah bintang, preview hover, & mode readonly.
 */
const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  onChange,
  readonly = false,
  size = "md",
  allowHalf = false,
  color = "#f59e0b", // amber-500
  className = "",
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const px = sizePx[size];
  const emptyColor = "var(--border-strong)";
  const isInteractive = !readonly && Boolean(onChange);

  // Hover lebih diutamakan untuk preview
  const displayValue = hoverValue ?? value;

  const computeFill = (starIndex: number): number => {
    const diff = displayValue - starIndex;
    if (diff >= 1) return 1;
    if (diff >= 0.5) return 0.5;
    return 0;
  };

  const handleSelect = (starIndex: number, isLeftHalf: boolean) => {
    if (!isInteractive) return;
    const newValue = allowHalf && isLeftHalf ? starIndex + 0.5 : starIndex + 1;
    onChange?.(newValue);
  };

  const handleHover = (starIndex: number, isLeftHalf: boolean) => {
    if (!isInteractive) return;
    setHoverValue(allowHalf && isLeftHalf ? starIndex + 0.5 : starIndex + 1);
  };

  return (
    <div
      className={["inline-flex items-center gap-1", className].join(" ")}
      role={isInteractive ? "slider" : "img"}
      aria-label={`Rating ${value} dari ${max}`}
      aria-valuenow={isInteractive ? value : undefined}
      aria-valuemin={isInteractive ? 0 : undefined}
      aria-valuemax={isInteractive ? max : undefined}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: max }).map((_, starIndex) => (
        <span
          key={starIndex}
          className={[
            "relative inline-flex transition-transform",
            isInteractive ? "cursor-pointer hover:scale-110" : "",
          ].join(" ")}
          style={{ width: px, height: px }}
        >
          <Star
            fill={computeFill(starIndex)}
            size={px}
            color={color}
            emptyColor={emptyColor}
          />

          {isInteractive && (
            <>
              {/* Paruh kiri (setengah jika allowHalf) */}
              <button
                type="button"
                aria-label={`Beri ${allowHalf ? starIndex + 0.5 : starIndex + 1} bintang`}
                className={allowHalf ? "absolute inset-y-0 left-0 w-1/2" : "hidden"}
                onMouseEnter={() => handleHover(starIndex, true)}
                onClick={() => handleSelect(starIndex, true)}
              />
              {/* Paruh kanan / seluruh bintang */}
              <button
                type="button"
                aria-label={`Beri ${starIndex + 1} bintang`}
                className={
                  allowHalf
                    ? "absolute inset-y-0 right-0 w-1/2"
                    : "absolute inset-0"
                }
                onMouseEnter={() => handleHover(starIndex, false)}
                onClick={() => handleSelect(starIndex, false)}
              />
            </>
          )}
        </span>
      ))}
    </div>
  );
};

export default Rating;
