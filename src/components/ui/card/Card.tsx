"use client";

import React, { ReactNode } from "react";

type CardVariant = "default" | "premium" | "gradient-border" | "accent-top" | "glass";

interface CardProps {
  children: ReactNode;
  title?: string;
  desc?: string;
  action?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  variant?: CardVariant;
  /** warna aksen untuk variant accent-top */
  accentColor?: string;
  className?: string;
}

const paddingMap = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const Card: React.FC<CardProps> = ({
  children,
  title,
  desc,
  action,
  footer,
  padding = "md",
  hover = false,
  variant = "default",
  accentColor = "var(--color-primary)",
  className = "",
}) => {
  const hasHeader = title || desc || action;

  const base = "relative rounded-2xl transition-all duration-300";
  const variantClasses: Record<CardVariant, string> = {
    default: "border border-[var(--border-default)] bg-[var(--surface-card)]",
    premium: "border border-[var(--border-default)] surface-premium",
    "gradient-border": "ring-gradient bg-[var(--surface-card)]",
    "accent-top": "border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden",
    glass: "border border-[var(--border-light)] bg-[var(--surface-card)]/70 backdrop-blur-xl",
  };

  const hoverClasses = hover
    ? "hover:-translate-y-1 hover:shadow-theme-lg cursor-pointer"
    : "";

  return (
    <div className={[base, variantClasses[variant], hoverClasses, className].join(" ")}>
      {variant === "accent-top" && (
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${accentColor}, var(--color-accent))` }}
        />
      )}

      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-light)]">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>}
            {desc && <p className="mt-0.5 text-sm text-[var(--text-caption)]">{desc}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={paddingMap[padding]}>{children}</div>

      {footer && <div className="px-5 py-4 border-t border-[var(--border-light)]">{footer}</div>}
    </div>
  );
};

export default Card;
