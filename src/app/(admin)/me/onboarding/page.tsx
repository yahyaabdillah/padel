"use client";

import React from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/feedback/Skeleton";
import EmptyState from "@/components/ui/feedback/EmptyState";
import OnboardingStepper from "@/components/member/OnboardingStepper";
import { useOnboarding } from "@/context/OnboardingContext";

export default function MemberOnboardingPage() {
  const { isReady, member, isOnboarded, reset } = useOnboarding();

  return (
    <div>
      <PageBreadCrumb pageTitle="Onboarding" />

      {!isReady ? (
        <Card padding="lg">
          <Skeleton className="h-12 w-full" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        </Card>
      ) : !member ? (
        <Card padding="lg">
          <EmptyState
            title="Khusus member"
            description="Onboarding hanya tersedia untuk akun member. Masuk sebagai member untuk melengkapi profil padel."
            action={
              <Link href="/me">
                <Button size="sm">Ke Dashboard</Button>
              </Link>
            }
          />
        </Card>
      ) : isOnboarded ? (
        <Card padding="lg">
          <EmptyState
            title="Profil sudah lengkap"
            description="Kamu sudah menyelesaikan onboarding. Mau memperbarui profil padel-mu?"
            action={
              <div className="flex items-center gap-2">
                <Link href="/me">
                  <Button variant="outline" size="sm">
                    Ke Dashboard
                  </Button>
                </Link>
                <Button size="sm" onClick={reset}>
                  Isi Ulang
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <OnboardingStepper />
      )}
    </div>
  );
}
