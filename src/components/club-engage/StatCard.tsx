"use client";

import React, { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** delta string like "+12%" */
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  hint?: string;
  /** accent color for the icon chip; defaults to brand primary */
  accent?: "primary" | "secondary" | "accent" | "amber" | "rose";
  className?: string;
}

const accentChip: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  secondary: "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]",
  accent: "bg-[var(--color-accent-light)] text-[var(--color-accent-700,#557d0c)]",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

const deltaToneClasses = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  flat: "text-[var(--text-caption)]",
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  delta,
  deltaTone = "up",
  hint,
  accent = "primary",
  className = "",
}) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-theme-md ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-caption)]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-heading)]">
            {value}
          </p>
        </div>
        {icon && (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentChip[accent]}`}
          >
            {icon}
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${deltaToneClasses[deltaTone]}`}>
              {deltaTone === "up" && "▲"}
              {deltaTone === "down" && "▼"}
              {delta}
            </span>
          )}
          {hint && <span className="text-[var(--text-muted)]">{hint}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
