import React from "react";

interface Props {
  className?: string;
  /** force light text (for dark hero backgrounds) */
  light?: boolean;
}

/** PadelHub wordmark with a lime padel-ball dot. */
const PadelWordmark: React.FC<Props> = ({ className = "", light = false }) => (
  <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
    <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <ellipse cx="11" cy="9" rx="6.5" ry="7" />
        <path strokeLinecap="round" d="m6 14-3 6.5M9 20.5H4" />
      </svg>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[var(--color-accent)]" />
    </span>
    <span className={`text-xl ${light ? "text-white" : "text-[var(--text-heading)]"}`}>
      Padel<span className="text-[var(--color-primary)]">Hub</span>
    </span>
  </span>
);

export default PadelWordmark;
