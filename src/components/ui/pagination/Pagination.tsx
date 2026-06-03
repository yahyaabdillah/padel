"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = "",
}) => {
  const pages = (): (number | "...")[] => {
    const totalNumbers = siblingCount * 2 + 5;
    if (totalPages <= totalNumbers) return range(1, totalPages);

    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      return [...range(1, 3 + siblingCount * 2), "...", totalPages];
    }
    if (showLeftDots && !showRightDots) {
      return [1, "...", ...range(totalPages - (2 + siblingCount * 2), totalPages)];
    }
    return [1, "...", ...range(leftSibling, rightSibling), "...", totalPages];
  };

  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`${btn} border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      {pages().map((p, i) =>
        p === "..." ? (
          <span key={`dot-${i}`} className="px-1 text-[var(--text-muted)]">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={[
              btn,
              p === currentPage
                ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                : "border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
            ].join(" ")}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${btn} border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default Pagination;
