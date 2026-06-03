import React, { ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "dashed" | "chip" | "ghost" | "soft";
type ButtonSize = "sm" | "md" | "lg";
type ButtonRound = "none" | "sm" | "md" | "lg" | "full";

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  round?: ButtonRound;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;       // for chip: active/selected state
  /** efek kilau diagonal saat hover (khas Gym pro) */
  sheen?: boolean;
  /** glow neon saat hover */
  glow?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  round = "md",
  startIcon,
  endIcon,
  onClick,
  disabled = false,
  active = false,
  sheen = false,
  glow = false,
  fullWidth = false,
  className = "",
  type = "button",
}) => {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3.5 py-2 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-sm gap-2.5",
  };

  const roundClasses: Record<ButtonRound, string> = {
    none: "rounded-none",
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: [
      "bg-[var(--color-primary)] text-[var(--color-primary-text)]",
      "shadow-theme-xs hover:shadow-theme-md",
      "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
      glow ? "hover:[box-shadow:var(--glow-primary)]" : "hover:bg-[var(--color-primary-hover)]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
    ].join(" "),
    soft: [
      "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
      "hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-text)]",
      "active:scale-[0.98]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    ].join(" "),
    outline: [
      "bg-transparent text-[var(--color-secondary)]",
      "ring-1 ring-inset ring-[var(--border-default)]",
      "hover:ring-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]",
      "active:scale-[0.98]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    ].join(" "),
    ghost: [
      "bg-transparent text-[var(--color-secondary)]",
      "hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]",
      "active:scale-[0.98]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    ].join(" "),
    dashed: [
      "bg-transparent text-[var(--color-tertiary)]",
      "border-2 border-dashed border-[var(--border-strong)]",
      "hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]",
      "active:scale-[0.98]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    ].join(" "),
    chip: active
      ? [
          "bg-[var(--color-primary)] text-[var(--color-primary-text)]",
          "shadow-theme-xs active:scale-[0.97]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")
      : [
          "bg-[var(--surface-muted)] text-[var(--color-secondary)]",
          "hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] active:scale-[0.97]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" "),
  };

  const resolvedRound = variant === "chip" && round === "md" ? "full" : round;
  const useSheen = sheen && (variant === "primary" || variant === "soft");

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out",
        fullWidth ? "w-full" : "",
        useSheen ? "sheen" : "",
        sizeClasses[size],
        roundClasses[resolvedRound],
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {startIcon && <span className="relative z-2 flex items-center shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5">{startIcon}</span>}
      <span className="relative z-2">{children}</span>
      {endIcon && <span className="relative z-2 flex items-center shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">{endIcon}</span>}
    </button>
  );
};

export default Button;
