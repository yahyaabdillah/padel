import React from "react";

type BadgeVariant = "light" | "solid" | "outline";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "emerald"
  | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  /** tampilkan titik indikator warna di depan */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Warna disusun pakai Tailwind classes (blue primary, slate neutral, emerald, dst)
const colorMap: Record<BadgeColor, { light: string; solid: string; outline: string; dot: string }> = {
  primary: {
    light: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    solid: "bg-blue-600 text-white",
    outline: "border border-blue-500 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  secondary: {
    light: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    solid: "bg-slate-600 text-white",
    outline: "border border-slate-400 text-slate-600 dark:text-slate-300",
    dot: "bg-slate-500",
  },
  success: {
    light: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    solid: "bg-emerald-500 text-white",
    outline: "border border-emerald-500 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  error: {
    light: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    solid: "bg-red-500 text-white",
    outline: "border border-red-500 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  warning: {
    light: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    solid: "bg-amber-500 text-white",
    outline: "border border-amber-500 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  info: {
    light: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
    solid: "bg-cyan-500 text-white",
    outline: "border border-cyan-500 text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  emerald: {
    light: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    solid: "bg-emerald-600 text-white",
    outline: "border border-emerald-600 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-600",
  },
  neutral: {
    light: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
    solid: "bg-slate-700 text-white",
    outline: "border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  dot = false,
  children,
  className = "",
}) => {
  const sizeStyles = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-0.5";
  const colorStyles = colorMap[color][variant];

  return (
    <span
      className={[
        "inline-flex items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap",
        sizeStyles,
        colorStyles,
        className,
      ].join(" ")}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${colorMap[color].dot}`} />}
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </span>
  );
};

export default Badge;
