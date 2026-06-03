"use client";

import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-9 w-9 border-[3px]" };

const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-[var(--border-default)] border-t-[var(--color-primary)] ${sizeMap[size]} ${className}`}
    />
  );
};

export default Spinner;
