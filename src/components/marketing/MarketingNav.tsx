"use client";

import React, { useState } from "react";
import Link from "next/link";
import PadelWordmark from "./PadelWordmark";
import Button from "@/components/ui/button/Button";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

const links = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Customers" },
];

const MarketingNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-light)] bg-[var(--surface-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Link href="/landing">
          <PadelWordmark />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[var(--text-caption)] transition-colors hover:text-[var(--color-primary)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <Link href="/signin" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button size="sm" glow>
              Start free
            </Button>
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-1 rounded-lg p-2 text-[var(--text-caption)] md:hidden"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--border-light)] px-5 py-3 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-[var(--text-caption)]"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
};

export default MarketingNav;
