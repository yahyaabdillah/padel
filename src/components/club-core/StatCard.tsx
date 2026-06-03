"use client";

import React, { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** e.g. "+12.4%" */
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  hint?: string;
  accent?: string; // hex for the icon chip
  /** optional sparkline / progress slot under the value */
  children?: ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  delta,
  deltaTone = "up",
  hint,
  accent = "var(--color-primary)",
  children,
  className = "",
}) => {
  const deltaCls =
    deltaTone === "up"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15"
      : deltaTone === "down"
        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/15"
        : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {value}
          </div>
        </div>
        {icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-theme-xs"
            style={{ background: accent }}
          >
            {icon}
          </span>
        )}
      </div>

      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2">
          {delta && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${deltaCls}`}>
              {deltaTone === "up" && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              )}
              {deltaTone === "down" && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {delta}
            </span>
          )}
          {hint && <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};

export default StatCard;
