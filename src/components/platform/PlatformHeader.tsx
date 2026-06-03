"use client";

import React from "react";

interface PlatformHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Hero header used at the top of platform pages — gradient brand band. */
const PlatformHeader: React.FC<PlatformHeaderProps> = ({
  eyebrow = "Platform",
  title,
  description,
  actions,
}) => {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 text-white shadow-theme-md dark:border-brand-500/30 md:p-7">
      {/* lime ball motif */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-accent-300/30 blur-2xl" />
      <div className="pointer-events-none absolute right-10 top-6 h-3 w-3 rounded-full bg-accent-300 shadow-[0_0_18px_4px_rgba(198,255,61,0.6)]" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-300" />
            {eyebrow}
          </span>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-white/80">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default PlatformHeader;
