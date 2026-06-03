"use client";

import React from "react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
};

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: "chevron" | "slash" | "dot";
  showHome?: boolean;
  homeHref?: string;
  className?: string;
}

const Separator = ({ type }: { type: "chevron" | "slash" | "dot" }) => {
  if (type === "slash") return <span className="text-[var(--text-muted)]">/</span>;
  if (type === "dot") return <span className="text-[var(--text-muted)]">•</span>;
  return (
    <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
};

const HomeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = "chevron",
  showHome = true,
  homeHref = "/",
  className = "",
}) => {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Home", href: homeHref, icon: <HomeIcon /> }, ...items]
    : items;

  return (
    <nav aria-label="breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {allItems.map((item, i) => {
          const isLast = i === allItems.length - 1;
          return (
            <li key={i} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-[var(--text-caption)] transition-colors hover:text-[var(--color-primary)]"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    isLast ? "font-medium text-[var(--text-heading)]" : "text-[var(--text-caption)]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
              {!isLast && <Separator type={separator} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
