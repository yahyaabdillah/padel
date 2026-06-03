import React from "react";

type P = { className?: string };
const base = "h-5 w-5";

export const CalendarIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path strokeLinecap="round" d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);

export const WalletIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
    <rect x="3" y="7" width="18" height="12" rx="2" />
    <circle cx="16.5" cy="13" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const TrophyIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
    <path strokeLinecap="round" d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3M12 12v3M9 20h6M10 20l.5-3h3l.5 3" />
  </svg>
);

export const BoltIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);

export const PadelIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <ellipse cx="11" cy="8.5" rx="6.5" ry="7" />
    <path strokeLinecap="round" d="m6.5 14 -3 6.5M9 20.5h-5" />
    <circle cx="9" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="13" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="11" cy="10" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const UsersIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="9" cy="8" r="3.2" />
    <path strokeLinecap="round" d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M16.5 13.5a5.5 5.5 0 0 1 4 5.5" />
  </svg>
);

export const ReceiptIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinejoin="round" d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3Z" />
    <path strokeLinecap="round" d="M9 8h6M9 12h6" />
  </svg>
);

export const ClockIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="8.5" />
    <path strokeLinecap="round" d="M12 7.5V12l3 2" />
  </svg>
);

export const PlusIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
  </svg>
);

export const ArrowUpIcon: React.FC<P> = ({ className = base }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
