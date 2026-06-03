"use client";

import React, { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const DefaultIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = "" }) => {
  return (
    <div
      className={`animate-pop-in relative flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      {/* Wadah ikon + dekorasi */}
      <div className="relative mb-4 flex items-center justify-center">
        {/* Blob gradient blur lembut di belakang ikon */}
        <div
          aria-hidden
          className="pointer-events-none absolute h-28 w-28 rounded-full opacity-25 blur-2xl dark:opacity-40"
          style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
        />
        {/* Cincin gradient halus di sekeliling wadah */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-[4.75rem] w-[4.75rem] rounded-2xl opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1.5px",
          }}
        />
        {/* Wadah ikon */}
        <div className="animate-float relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-card)] text-[var(--color-primary)] shadow-theme-sm">
          {icon || <DefaultIcon />}
        </div>
      </div>

      <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[var(--text-caption)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
