"use client";

import React, { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  trend?: { value: string; up?: boolean };
  accent?: "primary" | "accent" | "teal" | "neutral";
  className?: string;
}

const accentMap = {
  primary: { bg: "bg-[var(--color-primary-light)]", text: "text-[var(--color-primary)]" },
  accent: { bg: "bg-[var(--color-accent-light)]", text: "text-[#557d0c] dark:text-[#aef218]" },
  teal: { bg: "bg-[var(--color-secondary-light)]", text: "text-[var(--color-secondary)]" },
  neutral: { bg: "bg-[var(--surface-muted)]", text: "text-[var(--text-heading)]" },
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  hint,
  trend,
  accent = "primary",
  className = "",
}) => {
  const a = accentMap[accent];
  return (
    <div
      className={`rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 transition-all duration-300 hover:shadow-theme-md ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-caption)]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-heading)]">{value}</p>
        </div>
        {icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.bg} ${a.text}`}>
            {icon}
          </span>
        )}
      </div>
      {(hint || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium ${
                trend.up
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              }`}
            >
              {trend.up ? "▲" : "▼"} {trend.value}
            </span>
          )}
          {hint && <span className="text-[var(--text-caption)]">{hint}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
