"use client";

import React from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import { ClubDataProvider, useClubData } from "@/components/club-core/ClubDataContext";
import { useAccess } from "@/context/AccessContext";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import {
  type Court,
  courtEnvironmentMeta,
  courtWallMeta,
  courtFormatMeta,
  courtStatusMeta,
  weekdayMeta,
  dayPeakCount,
} from "@/data/padel/club/courts";

const openDaysLabel = (c: Court) => {
  const openDays = (c.schedule ?? []).filter((s) => s.available);
  if (openDays.length === 0) return "Tutup";
  if (openDays.length === 7) return "Setiap hari";
  return weekdayMeta
    .filter((w) => openDays.some((s) => s.day === w.value))
    .map((w) => w.short)
    .join(", ");
};

const totalPeakHours = (c: Court) =>
  (c.schedule ?? []).reduce((sum, s) => sum + dayPeakCount(s), 0);

function CourtsInner() {
  const router = useRouter();
  const { courts, deleteCourt } = useClubData();
  const toast = useToast();
  const { can } = useAccess();
  const canCreate = can("master.courts", "create");
  const canUpdate = can("master.courts", "update");
  const canDelete = can("master.courts", "delete");

  const goCreate = () => router.push("/courts/new");
  const goEdit = (c: Court) => router.push(`/courts/${c.id}/edit`);

  const activeCount = courts.filter((c) => c.status === "active").length;
  const maintCount = courts.filter((c) => c.status === "maintenance").length;
  const avgPeak =
    courts.length > 0
      ? Math.round(courts.reduce((s, c) => s + c.pricePeak, 0) / courts.length)
      : 0;

  return (
    <div>
      <PageBreadcrumb pageTitle="Lapangan" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
            {courts.length} lapangan
          </span>
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {activeCount} aktif
          </span>
          {maintCount > 0 && (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {maintCount} perbaikan
            </span>
          )}
          <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            Rata-rata peak {formatIDR(avgPeak, true)}
          </span>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            sheen
            glow
            onClick={goCreate}
            startIcon={<span className="text-base leading-none">+</span>}
          >
            Tambah Lapangan
          </Button>
        )}
      </div>

      {courts.length === 0 ? (
        <EmptyState
          title="Belum ada lapangan"
          description="Tambahkan lapangan padel pertama Anda untuk mulai menerima booking."
          action={
            canCreate ? (
              <Button variant="primary" onClick={goCreate}>
                Tambah Lapangan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courts.map((c) => {
            const envMeta = courtEnvironmentMeta[c.environment];
            const sMeta = courtStatusMeta[c.status];
            return (
              <div
                key={c.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]"
              >
                {/* color banner / hero image */}
                <div
                  className="relative h-24 bg-cover bg-center"
                  style={
                    c.image
                      ? { backgroundImage: `url(${c.image})` }
                      : {
                          background: `linear-gradient(120deg, ${c.color}, color-mix(in srgb, ${c.color} 55%, #000))`,
                        }
                  }
                >
                  {c.image ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  ) : (
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)",
                        backgroundSize: "18px 18px",
                      }}
                    />
                  )}
                  <div className="absolute right-3 top-3">
                    <ToneBadge tone={sMeta.tone} variant="solid">
                      {sMeta.label}
                    </ToneBadge>
                  </div>
                  <h3 className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
                    {c.name}
                  </h3>
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <ToneBadge tone={envMeta.tone}>{envMeta.label}</ToneBadge>
                    <ToneBadge tone="neutral">{courtWallMeta[c.wall].label}</ToneBadge>
                    <ToneBadge tone="secondary">{courtFormatMeta[c.format].label}</ToneBadge>
                  </div>

                  {c.note && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{c.note}</p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        Normal
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {formatIDR(c.priceOffPeak)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
                      <p className="text-[11px] uppercase tracking-wide text-brand-500">Peak</p>
                      <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                        {formatIDR(c.pricePeak)}
                      </p>
                    </div>
                  </div>

                  {/* peak schedule */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-2 dark:border-gray-700">
                      <span className="text-[11px] uppercase tracking-wide text-gray-400">
                        Hari buka
                      </span>
                      <span className="text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                        {openDaysLabel(c)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-2 dark:border-gray-700">
                      <span className="text-[11px] uppercase tracking-wide text-gray-400">
                        Total jam peak
                      </span>
                      <span className="text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                        {totalPeakHours(c)} jam / minggu
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {canUpdate && (
                      <Button variant="outline" size="sm" fullWidth onClick={() => goEdit(c)}>
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-500/10"
                        onClick={() => {
                          deleteCourt(c.id);
                          toast.info(`${c.name} dihapus`);
                        }}
                      >
                        Hapus
                      </Button>
                    )}
                    {!canUpdate && !canDelete && (
                      <span className="text-xs text-[var(--text-muted)]">Hanya lihat</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CourtsPage() {
  return (
    <ClubDataProvider>
      <CourtsInner />
    </ClubDataProvider>
  );
}
