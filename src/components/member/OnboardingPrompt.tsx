"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/button/Button";
import { useOnboarding } from "@/context/OnboardingContext";

/**
 * OnboardingPrompt — first-login nudge for members who haven't completed
 * (or skipped) the optional padel-profile onboarding stepper.
 *
 * Mounted once in the root layout (inside OnboardingProvider). It self-gates:
 *   • only renders for a signed-in member with `needsOnboarding`
 *   • only on the member portal (/me/*), and never on the onboarding page itself
 *   • dismissible for the session (skip() persists the real opt-out)
 *
 * Renders as a fixed bottom banner so it overlays any member page without the
 * page needing to import it — keeps the member-portal shell untouched.
 */
export default function OnboardingPrompt() {
  const { needsOnboarding, skip, member } = useOnboarding();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  const onMemberPortal = pathname?.startsWith("/me");
  const onOnboardingPage = pathname?.startsWith("/me/onboarding");

  if (!needsOnboarding || dismissed || !onMemberPortal || onOnboardingPage) {
    return null;
  }

  const firstName = member?.name?.split(" ")[0] ?? "Player";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--surface-card)] p-4 shadow-theme-lg sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" strokeLinejoin="round" />
              <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-heading)]">
              Lengkapi profil padel-mu, {firstName}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-caption)] sm:text-sm">
              Tambahkan skill, posisi & rating untuk match-making yang lebih akurat.
              Hanya 1 menit.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              skip();
              setDismissed(true);
            }}
          >
            Nanti saja
          </Button>
          <Link href="/me/onboarding">
            <Button size="sm" glow>
              Lengkapi
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
