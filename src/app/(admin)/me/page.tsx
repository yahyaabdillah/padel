"use client";

import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { useRole } from "@/context/RoleContext";

export default function MemberDashboardPage() {
  const { currentUser } = useRole();
  return (
    <div>
      <PageBreadCrumb pageTitle="My Dashboard" />
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
        <h1 className="text-2xl font-bold text-[var(--text-heading)]">
          Hi, {currentUser.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-caption)]">
          Kelola booking lapangan, membership, dan riwayat pembayaran dari portal Anda.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/me/book">
            <Button variant="primary">Book a court</Button>
          </Link>
          <Link href="/me/bookings">
            <Button variant="outline">My bookings</Button>
          </Link>
          <Link href="/me/payments">
            <Button variant="outline">Payment history</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
