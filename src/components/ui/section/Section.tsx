"use client";

import React, { ReactNode } from "react";

interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** spacing antar konten */
  spacing?: "sm" | "md" | "lg";
}

const spacingMap = {
  sm: "space-y-3",
  md: "space-y-5",
  lg: "space-y-8",
};

const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  spacing = "md",
}) => {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-semibold text-[var(--text-heading)]">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-sm text-[var(--text-caption)]">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={spacingMap[spacing]}>{children}</div>
    </section>
  );
};

export default Section;
