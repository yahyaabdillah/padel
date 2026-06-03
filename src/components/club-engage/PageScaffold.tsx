"use client";

import React, { ReactNode, useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Skeleton from "@/components/ui/feedback/Skeleton";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useRole } from "@/context/RoleContext";

interface PageScaffoldProps {
  title: string;
  /** short subtitle shown under the page title */
  subtitle?: string;
  /** right-aligned actions (buttons, filters) */
  actions?: ReactNode;
  /** permissions — if provided and the user lacks all, show access-denied */
  requireAny?: string[];
  children: ReactNode;
  /** custom skeleton; default renders 4 stat cards + a block */
  skeleton?: ReactNode;
}

const LockIcon = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const DefaultSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height={108} className="rounded-2xl" />
      ))}
    </div>
    <Skeleton height={360} className="rounded-2xl" />
  </div>
);

/**
 * Standard page wrapper: breadcrumb + title row + permission gate + a mount
 * skeleton (so every page has a loading state without per-page boilerplate).
 */
const PageScaffold: React.FC<PageScaffoldProps> = ({
  title,
  subtitle,
  actions,
  requireAny,
  children,
  skeleton,
}) => {
  const { hasAnyPermission, isSessionReady } = useRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 280);
    return () => window.clearTimeout(id);
  }, []);

  const ready = mounted && isSessionReady;
  const allowed = !requireAny || hasAnyPermission(requireAny);

  return (
    <div>
      <PageBreadcrumb pageTitle={title} />

      {(subtitle || actions) && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {subtitle ? (
            <p className="max-w-2xl text-sm text-[var(--text-caption)]">{subtitle}</p>
          ) : (
            <span />
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      {!ready ? (
        skeleton ?? <DefaultSkeleton />
      ) : !allowed ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
          <EmptyState
            icon={<LockIcon />}
            title="Access restricted"
            description="Your role doesn't have permission to view this module. Contact your club owner or platform admin to request access."
          />
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default PageScaffold;
