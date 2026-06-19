"use client";

// Member ▸ Book a Court — Step 3: court selection (own page, mirrors staff
// /bookings/courts). Reached from /me/book after picking a date + start time.
// Lists every active court available at that exact 60-min slot. Click a court →
// payment page (/me/book/payment).

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { getMeBookDataAction, getMeOccupancyAction } from "../actions";
import {
  SESSION_SLOTS,
  slotLabel,
  prettyDate,
  toKey,
  idr,
  sessionAt,
} from "../book-helpers";
import type { MeBookData, MeCourt } from "../types";

interface CourtOption {
  court: MeCourt;
  price: number;
  hasPeak: boolean;
}

function CourtPickerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingDate = params.get("date") ?? "";
  const startHour = Number(params.get("hour") ?? "-1");

  const [data, setData] = useState<MeBookData | null>(null);
  const [occupied, setOccupied] = useState<Map<string, Set<number>>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [d, occRows] = await Promise.all([
      getMeBookDataAction(),
      bookingDate ? getMeOccupancyAction(bookingDate) : Promise.resolve([]),
    ]);
    setData(d);
    setOccupied(new Map(occRows.map((r) => [r.courtId, new Set(r.slots)])));
    setLoading(false);
  }, [bookingDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayKey = toKey(new Date());
  const nowHour = new Date().getHours();
  const startLabel = startHour >= 0 ? slotLabel(startHour * 2) : "";
  const endLabel = startHour >= 0 ? slotLabel(startHour * 2 + SESSION_SLOTS) : "";

  const available = useMemo<CourtOption[]>(() => {
    if (!data || startHour < 0 || !bookingDate) return [];
    const weekday = new Date(`${bookingDate}T00:00:00`).getDay();
    const guard = { isToday: bookingDate === todayKey, nowHour };
    const out: CourtOption[] = [];
    for (const court of data.courts) {
      const occ = occupied.get(court.id) ?? new Set<number>();
      const s = sessionAt(court, weekday, startHour, occ, guard);
      if (s) out.push({ court, price: s.price, hasPeak: s.hasPeak });
    }
    return out;
  }, [data, startHour, bookingDate, occupied, todayKey, nowHour]);

  const pickCourt = (opt: CourtOption) => {
    const next = new URLSearchParams({
      court: opt.court.id,
      date: bookingDate,
      hour: String(startHour),
    });
    router.push(`/me/book/payment?${next.toString()}`);
  };

  if (loading || !data) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      </Card>
    );
  }

  if (startHour < 0 || !bookingDate) {
    return (
      <Card padding="lg">
        <div className="py-10 text-center">
          <p className="text-sm text-[var(--text-caption)]">
            Data pencarian tidak lengkap atau sudah kedaluwarsa.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/me/book")}>
              Kembali ke pencarian
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-heading)]">Pilih lapangan</h3>
          <p className="mt-0.5 text-xs text-[var(--text-caption)]">
            {prettyDate(bookingDate)} · {startLabel}–{endLabel} · {available.length} lapangan tersedia
          </p>
        </div>
        <Button variant="outline" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/me/book")}>
          Ganti jam
        </Button>
      </div>

      {available.length === 0 ? (
        <EmptyState
          title="Tidak ada lapangan tersedia"
          description="Semua lapangan di jam ini sudah terisi. Kembali dan pilih jam lain."
        />
      ) : (
        <div className="space-y-3">
          {available.map(({ court, price, hasPeak }) => (
            <button
              key={court.id}
              type="button"
              onClick={() => pickCourt({ court, price, hasPeak })}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: court.color }}
              >
                {court.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--text-heading)]">{court.name}</p>
                <p className="truncate text-xs text-[var(--text-caption)]">
                  {court.environment} · {court.wall} · {court.format}
                </p>
              </div>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {hasPeak && (
                  <Badge variant="light" color="warning" size="sm">
                    peak
                  </Badge>
                )}
                <span className="text-sm font-bold text-[var(--text-heading)]">{idr(price)}</span>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function MeBookCourtsPage() {
  return (
    <div>
      <PageBreadCrumb pageTitle="Pilih Lapangan" />
      <Suspense fallback={null}>
        <CourtPickerInner />
      </Suspense>
    </div>
  );
}
