"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  /** efek shimmer bergerak (default) atau pulse sederhana */
  animation?: "shimmer" | "pulse";
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rect",
  width,
  height,
  animation = "shimmer",
}) => {
  const shape = variant === "circle" ? "rounded-full" : variant === "text" ? "rounded h-4" : "rounded-lg";

  const shimmerStyle: React.CSSProperties =
    animation === "shimmer"
      ? {
          backgroundImage:
            "linear-gradient(90deg, var(--surface-muted) 0%, color-mix(in srgb, var(--surface-muted) 60%, var(--surface-card)) 50%, var(--surface-muted) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }
      : {};

  return (
    <div
      className={[
        animation === "pulse" ? "animate-pulse bg-[var(--surface-muted)]" : "",
        shape,
        className,
      ].join(" ")}
      style={{
        width: width ?? (variant === "text" ? "100%" : undefined),
        height: height ?? (variant === "circle" ? width : undefined),
        ...shimmerStyle,
      }}
    />
  );
};

export default Skeleton;
