"use client";

// Member ▸ Book a Court — Step 4: payment (own page, mirrors staff
// /bookings/payment). The cart is seeded from the URL (court/date/hour) but the
// member can ADD more sessions (another court / date / time) before paying.
// Membership benefit (quota + discount) is previewed across the whole cart on
// the server. Payment is non-cash only (cash is staff-only). Confirm persists
// every session atomically via createMyBookingAction.

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, Trash2, Clock, Search, ArrowLeft } from "lucide-react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  getMeBookDataAction,
  getMeOccupancyAction,
  previewMyBookingAction,
  createMyBookingAction,
} from "../actions";
import {
  SESSION_MINUTES,
  SESSION_SLOTS,
  toKey,
  slotLabel,
  prettyDate,
  idr,
  sessionAt,
} from "../book-helpers";
import {
  MEMBER_PAYMENT_METHODS,
  type MeBookData,
  type MeCourt,
  type MemberPaymentMethod,
  type PreviewMyBookingResult,
  type BookSessionInput,
} from "../types";

interface CartItem {
  id: string;
  courtId: string;
  dateKey: string;
  startHour: number;
}

let cartSeq = 0;
const nextCartId = () => `c-${Date.now().toString(36)}-${cartSeq++}`;

function PaymentInner() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();

  const seedCourt = params.get("court") ?? "";
  const seedDate = params.get("date") ?? "";
  const seedHour = Number(params.get("hour") ?? "-1");

  const [data, setData] = useState<MeBookData | null>(null);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<MemberPaymentMethod>("QRIS");
  const [preview, setPreview] = useState<PreviewMyBookingResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadData = useCallback(async () => {
    const d = await getMeBookDataAction();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // seed the cart from the URL once
  useEffect(() => {
    if (seedCourt && seedDate && seedHour >= 0) {
      setCart([{ id: nextCartId(), courtId: seedCourt, dateKey: seedDate, startHour: seedHour }]);
    }
  }, [seedCourt, seedDate, seedHour]);

  const courtById = useCallback(
    (id: string): MeCourt | undefined => data?.courts.find((c) => c.id === id),
    [data],
  );

  // live preview across the whole cart
  useEffect(() => {
    if (cart.length === 0) {
      setPreview(null);
      return;
    }
    let alive = true;
    setPreviewing(true);
    const sessions: BookSessionInput[] = cart.map((c) => {
      const court = courtById(c.courtId);
      return {
        courtId: c.courtId,
        dateKey: c.dateKey,
        startHour: c.startHour,
        durationHours: 1,
        partySize: court?.format === "single" ? 2 : 4,
      };
    });
    void previewMyBookingAction({ sessions, paymentMethod: method })
      .then((res) => {
        if (alive) setPreview(res);
      })
      .finally(() => {
        if (alive) setPreviewing(false);
      });
    return () => {
      alive = false;
    };
  }, [cart, method, courtById]);

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const confirm = async () => {
    if (cart.length === 0 || saving) return;
    setSaving(true);
    const sessions: BookSessionInput[] = cart.map((c) => {
      const court = courtById(c.courtId);
      return {
        courtId: c.courtId,
        dateKey: c.dateKey,
        startHour: c.startHour,
        durationHours: 1,
        partySize: court?.format === "single" ? 2 : 4,
      };
    });
    const res = await createMyBookingAction({ sessions, paymentMethod: method });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal booking.");
      return;
    }
    toast.success(`Pembayaran ${idr(res.payable ?? 0)} diterima.`, `${cart.length} booking dikonfirmasi`);
    setConfirmedRef(res.paymentRef ?? res.id ?? "—");
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

  if (cart.length === 0 && !confirmedRef) {
    return (
      <Card padding="lg">
        <div className="py-10 text-center">
          <p className="text-sm text-[var(--text-caption)]">Keranjang kosong atau data kedaluwarsa.</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/me/book")}>
              Kembali ke pencarian
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // success receipt
  if (confirmedRef) {
    const courtNames = Array.from(new Set(cart.map((c) => courtById(c.courtId)?.name ?? "—")));
    return (
      <Card padding="lg">
        <div className="mx-auto max-w-md py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-heading)]">
            {cart.length > 1 ? `${cart.length} booking dikonfirmasi` : "Booking dikonfirmasi"}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-caption)]">
            {courtNames.join(", ")} — ref <span className="font-mono font-semibold">{confirmedRef}</span>
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/me/book")}>
              Booking lagi
            </Button>
            <Button variant="primary" sheen onClick={() => router.push("/me/bookings")}>
              Ke booking saya
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const m = data.membership;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: cart + payment */}
      <div className="space-y-6 lg:col-span-2">
        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">Daftar Booking</h3>
            <Button variant="outline" size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              Tambah booking
            </Button>
          </div>

          {cart.length === 0 ? (
            <EmptyState title="Belum ada booking" description="Tambahkan minimal satu sesi untuk melanjutkan." />
          ) : (
            <div className="space-y-2.5">
              {cart.map((item, idx) => {
                const court = courtById(item.courtId);
                const line = preview?.success ? preview.lines[idx] : undefined;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: court?.color ?? "#6D5BFF" }}
                    >
                      {(court?.name ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-heading)]">{court?.name ?? "—"}</p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {item.dateKey} · {slotLabel(item.startHour * 2)}–{slotLabel(item.startHour * 2 + SESSION_SLOTS)}
                      </p>
                    </div>
                    <div className="text-right">
                      {line?.coveredByQuota ? (
                        <Badge variant="light" color="success" size="sm">
                          Gratis kuota
                        </Badge>
                      ) : line && line.discountPct > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-[var(--text-muted)] line-through">{idr(line.basePrice)}</span>
                          <span className="text-sm font-semibold text-[var(--text-heading)]">{idr(line.payable)}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-[var(--text-heading)]">
                          {idr(line?.payable ?? line?.basePrice ?? 0)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      aria-label="Hapus booking"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h3 className="mb-1 text-lg font-semibold text-[var(--text-heading)]">Pembayaran</h3>
          <p className="mb-5 text-sm text-[var(--text-caption)]">
            Pilih metode pembayaran. Pembayaran tunai hanya tersedia di front desk (lewat staff).
          </p>

          <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Metode pembayaran</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MEMBER_PAYMENT_METHODS.map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => setMethod(pm)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                  method === pm
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-caption)] hover:border-[var(--color-primary)]/50"
                }`}
              >
                {pm}
              </button>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-[var(--border-default)] pt-5">
            <Button variant="outline" onClick={() => router.push("/me/book")}>
              Kembali
            </Button>
            <Button
              variant="primary"
              sheen
              glow
              onClick={confirm}
              disabled={saving || cart.length === 0 || previewing || !preview?.success}
            >
              {saving
                ? "Menyimpan…"
                : preview && preview.payable === 0
                  ? "Konfirmasi (gratis kuota)"
                  : `Bayar · ${idr(preview?.payable ?? 0)}`}
            </Button>
          </div>
        </Card>
      </div>

      {/* Right: summary */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-24">
          <Card padding="md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-heading)]">Ringkasan</span>
              <Badge variant="light" color={m.planName ? "primary" : "neutral"}>
                {m.planName ?? "Non-member"}
              </Badge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--text-caption)]">Jumlah sesi</dt>
                <dd className="text-right font-medium text-[var(--text-heading)]">
                  {cart.length} sesi (60 menit/sesi)
                </dd>
              </div>
              {m.planName && m.quotaTotal > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--text-caption)]">Sisa kuota</dt>
                  <dd className="text-right font-medium text-[var(--text-heading)]">
                    {preview?.success ? preview.quotaRemainingAfter : m.quotaRemaining} / {m.quotaTotal}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-3 space-y-1.5 border-t border-[var(--border-default)] pt-3 text-sm">
              <div className="flex items-center justify-between text-[var(--text-caption)]">
                <span>Subtotal</span>
                <span>{idr(preview?.subtotal ?? 0)}</span>
              </div>
              {preview?.success && preview.totalSavings > 0 && (
                <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                  <span>
                    Hemat membership
                    {preview.lines.filter((l) => l.coveredByQuota).length > 0
                      ? ` (${preview.lines.filter((l) => l.coveredByQuota).length}x kuota)`
                      : ""}
                  </span>
                  <span>−{idr(preview.totalSavings)}</span>
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-[var(--border-default)] pt-4">
              <p className="text-sm text-[var(--text-caption)]">Total bayar</p>
              <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">{idr(preview?.payable ?? 0)}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Add-booking modal */}
      <AddBookingModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        data={data}
        cart={cart}
        onAdd={(item) => {
          setCart((prev) => [...prev, { ...item, id: nextCartId() }]);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 * Add-booking modal — time-first, mirrors the main flow:
 * pick date + earliest time → available start times → pick a time → pick a
 * court available at that time (accounting for slots already in the cart).
 * ════════════════════════════════════════════════════════ */
interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MeBookData;
  cart: CartItem[];
  onAdd: (item: Omit<CartItem, "id">) => void;
}

interface TimeOpt {
  startHour: number;
  startLabel: string;
  endLabel: string;
  courtCount: number;
}
interface CourtOpt {
  court: MeCourt;
  price: number;
  hasPeak: boolean;
}

const AddBookingModal: React.FC<AddBookingModalProps> = ({ isOpen, onClose, data, cart, onAdd }) => {
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [startTime, setStartTime] = useState("07:00");
  const [results, setResults] = useState<TimeOpt[] | null>(null);
  const [searchedKey, setSearchedKey] = useState("");
  const [pickedHour, setPickedHour] = useState<number | null>(null);
  const [occupied, setOccupied] = useState<Map<string, Set<number>>>(new Map());

  const todayKey = toKey(new Date());
  const nowHour = new Date().getHours();

  useEffect(() => {
    if (isOpen) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setDate(d);
      setStartTime("07:00");
      setResults(null);
      setPickedHour(null);
      setSearchedKey("");
    }
  }, [isOpen]);

  const timeToHour = (t: string): number => {
    const m = /^(\d{1,2}):/.exec(t);
    return m ? Number(m[1]) : 7;
  };

  /** occupancy from DB + slots already in the cart for that date. */
  const occWithCart = useCallback(
    (courtId: string, key: string, base: Map<string, Set<number>>): Set<number> => {
      const occ = new Set(base.get(courtId) ?? []);
      cart
        .filter((c) => c.courtId === courtId && c.dateKey === key)
        .forEach((c) => {
          occ.add(c.startHour * 2);
          occ.add(c.startHour * 2 + 1);
        });
      return occ;
    },
    [cart],
  );

  const runSearch = async () => {
    const key = toKey(date);
    const weekday = date.getDay();
    const fromHour = timeToHour(startTime);

    const occRows = await getMeOccupancyAction(key);
    const occMap = new Map(occRows.map((r) => [r.courtId, new Set(r.slots)]));
    setOccupied(occMap);

    const guard = { isToday: key === todayKey, nowHour };
    const countByHour = new Map<number, number>();
    for (const court of data.courts) {
      const occ = occWithCart(court.id, key, occMap);
      for (let h = fromHour; h < 24; h++) {
        if (sessionAt(court, weekday, h, occ, guard)) {
          countByHour.set(h, (countByHour.get(h) ?? 0) + 1);
        }
      }
    }
    const opts: TimeOpt[] = [...countByHour.entries()]
      .sort(([a], [b]) => a - b)
      .map(([startHour, courtCount]) => ({
        startHour,
        startLabel: slotLabel(startHour * 2),
        endLabel: slotLabel(startHour * 2 + SESSION_SLOTS),
        courtCount,
      }));
    setSearchedKey(key);
    setPickedHour(null);
    setResults(opts);
  };

  const courtsAtPicked = useMemo<CourtOpt[]>(() => {
    if (pickedHour == null || !searchedKey) return [];
    const weekday = new Date(`${searchedKey}T00:00:00`).getDay();
    const guard = { isToday: searchedKey === todayKey, nowHour };
    const out: CourtOpt[] = [];
    for (const court of data.courts) {
      const occ = occWithCart(court.id, searchedKey, occupied);
      const s = sessionAt(court, weekday, pickedHour, occ, guard);
      if (s) out.push({ court, price: s.price, hasPeak: s.hasPeak });
    }
    return out;
  }, [pickedHour, searchedKey, data, occupied, occWithCart, todayKey, nowHour]);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Booking"
      description="Pilih tanggal & jam, lalu pilih lapangan yang tersedia."
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <DatePicker
            label="Tanggal main"
            mode="single"
            value={date}
            minDate={new Date(`${todayKey}T00:00:00`)}
            onChange={(v) => {
              if (v instanceof Date) {
                setDate(v);
                setResults(null);
                setPickedHour(null);
              }
            }}
          />
          <TimePicker
            label="Mulai dari jam"
            value={startTime}
            minuteStep={SESSION_MINUTES}
            placeholder="Pilih jam mulai"
            onChange={(v) => {
              setStartTime(v || "07:00");
              setResults(null);
              setPickedHour(null);
            }}
          />
          <Button variant="primary" sheen startIcon={<Search className="h-4 w-4" />} onClick={runSearch} className="h-11">
            Cari
          </Button>
        </div>

        {/* available times */}
        {results !== null && pickedHour == null && (
          <div>
            <p className="mb-2 text-xs text-[var(--text-caption)]">
              {searchedKey} · {results.length} pilihan jam
            </p>
            {results.length === 0 ? (
              <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-6 text-center text-sm text-[var(--text-caption)]">
                Tidak ada jam tersedia. Coba tanggal atau jam lain.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {results.map((t) => (
                  <button
                    key={t.startHour}
                    type="button"
                    onClick={() => setPickedHour(t.startHour)}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                        {t.startLabel}–{t.endLabel}
                      </p>
                      <p className="truncate text-xs text-[var(--text-caption)]">{t.courtCount} lapangan</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* courts at picked time */}
        {results !== null && pickedHour != null && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-[var(--text-caption)]">
                {searchedKey} · {slotLabel(pickedHour * 2)}–{slotLabel(pickedHour * 2 + SESSION_SLOTS)} ·{" "}
                {courtsAtPicked.length} lapangan
              </p>
              <Button variant="ghost" size="sm" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setPickedHour(null)}>
                Ganti jam
              </Button>
            </div>
            {courtsAtPicked.length === 0 ? (
              <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-6 text-center text-sm text-[var(--text-caption)]">
                Tidak ada lapangan tersedia di jam ini.
              </p>
            ) : (
              <div className="space-y-2">
                {courtsAtPicked.map(({ court, price, hasPeak }) => (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => onAdd({ courtId: court.id, dateKey: searchedKey, startHour: pickedHour })}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: court.color }}
                    >
                      {court.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-heading)]">{court.name}</p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {court.environment} · {court.format}
                      </p>
                    </div>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      {hasPeak && (
                        <Badge variant="light" color="warning" size="sm">
                          peak
                        </Badge>
                      )}
                      <span className="text-sm font-bold text-[var(--text-heading)]">{idr(price)}</span>
                      <Plus className="h-4 w-4 text-[var(--color-primary)]" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};

export default function MeBookPaymentPage() {
  return (
    <div>
      <PageBreadCrumb pageTitle="Pembayaran" />
      <Suspense fallback={null}>
        <PaymentInner />
      </Suspense>
    </div>
  );
}
