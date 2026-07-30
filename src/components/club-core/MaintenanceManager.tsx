"use client";

// PadelHub — Court Maintenance manager. Schedule day-off / repair / closure
// windows per court. Separate from the recurring weekly schedule (m_court).
// During a window the court is unavailable for booking.

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Wrench, CalendarOff, PartyPopper, CircleSlash, Trash2 } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import TextInput from "@/components/ui/input/TextInput";
import InputLabel from "@/components/ui/input/InputLabel";
import EmptyState from "@/components/ui/feedback/EmptyState";
import StatCard from "@/components/club-core/StatCard";
import ToneBadge from "@/components/club-core/ToneBadge";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { getCourtsAction, type Court as DbCourt } from "@/app/(admin)/courts/actions";
import {
  getMaintenanceAction,
  createMaintenanceAction,
  deleteMaintenanceAction,
  type MaintenanceRecord,
  type MaintenanceKind,
} from "@/app/(admin)/maintenance/actions";

const TODAY_KEY = "2026-06-02";

const kindMeta: Record<
  MaintenanceKind,
  { label: string; tone: "warning" | "error" | "info" | "neutral"; icon: React.ReactNode }
> = {
  maintenance: { label: "Perbaikan", tone: "warning", icon: <Wrench className="h-4 w-4" /> },
  holiday: { label: "Libur", tone: "error", icon: <CalendarOff className="h-4 w-4" /> },
  private_event: { label: "Acara Privat", tone: "info", icon: <PartyPopper className="h-4 w-4" /> },
  other: { label: "Lainnya", tone: "neutral", icon: <CircleSlash className="h-4 w-4" /> },
};

const pad = (n: number) => String(n).padStart(2, "0");
const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const fmtRange = (startIso: string, endIso: string) => {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  const d = (x: Date) => `${x.getDate()} ${months[x.getMonth()]} ${x.getFullYear()}`;
  const t = (x: Date) => `${pad(x.getHours())}:${pad(x.getMinutes())}`;
  if (sameDay) return `${d(s)} · ${t(s)}–${t(e)}`;
  return `${d(s)} ${t(s)} → ${d(e)} ${t(e)}`;
};

const isPast = (endIso: string) => new Date(endIso).getTime() < Date.now();
const isOngoing = (startIso: string, endIso: string) => {
  const now = Date.now();
  return new Date(startIso).getTime() <= now && now < new Date(endIso).getTime();
};

export default function MaintenanceManager() {
  const toast = useToast();
  const [courts, setCourts] = useState<DbCourt[]>([]);
  const [items, setItems] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // create form modal
  const [open, setOpen] = useState(false);
  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState<Date>(new Date(`${TODAY_KEY}T00:00:00`));
  const [fromTime, setFromTime] = useState("07:00");
  const [toTime, setToTime] = useState("23:00");
  const [allDay, setAllDay] = useState(true);
  const [kind, setKind] = useState<MaintenanceKind>("maintenance");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<MaintenanceRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([getCourtsAction(), getMaintenanceAction()]);
      setCourts(c);
      setItems(m);
      if (!courtId && c.length > 0) setCourtId(c[0].id);
    } catch {
      toast.error("Gagal memuat data maintenance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setDate(new Date(`${TODAY_KEY}T00:00:00`));
    setFromTime("07:00");
    setToTime("23:00");
    setAllDay(true);
    setKind("maintenance");
    setReason("");
    setSubmitted(false);
    setCourtId(courts[0]?.id ?? "");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const stats = useMemo(() => {
    const ongoing = items.filter((m) => isOngoing(m.start, m.end)).length;
    const upcoming = items.filter((m) => new Date(m.start).getTime() > Date.now()).length;
    return { total: items.length, ongoing, upcoming };
  }, [items]);

  // upcoming + ongoing first, past dimmed at the bottom
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ap = isPast(a.end) ? 1 : 0;
      const bp = isPast(b.end) ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [items]);

  const courtValid = !!courtId;
  const reasonValid = reason.trim().length >= 2;
  const timeValid = allDay || toTime > fromTime;
  const canSubmit = courtValid && reasonValid && timeValid;

  const save = async () => {
    setSubmitted(true);
    if (!canSubmit || saving) return;
    setSaving(true);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const start = allDay ? `${key}T00:00:00` : `${key}T${fromTime}:00`;
    const end = allDay ? `${key}T23:59:00` : `${key}T${toTime}:00`;

    const res = await createMaintenanceAction({ courtId, start, end, reason, kind });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan.", "Maintenance");
      return;
    }
    toast.success("Jadwal maintenance ditambahkan.");
    setOpen(false);
    void load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteMaintenanceAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error("Gagal menghapus.");
      return;
    }
    toast.info("Jadwal maintenance dihapus.");
    void load();
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Maintenance Lapangan" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total jadwal" value={stats.total} accent="var(--color-primary)" />
        <StatCard label="Berlangsung" value={stats.ongoing} accent="#F59E0B" />
        <StatCard label="Akan datang" value={stats.upcoming} accent="#14B8A6" />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-[var(--text-caption)]">
          Tandai lapangan tutup karena perbaikan, libur, atau acara privat. Saat
          jadwal aktif, lapangan tidak bisa dibooking pada rentang waktu tersebut.
        </p>
        <Button
          variant="primary"
          sheen
          glow
          startIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          Jadwalkan Maintenance
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal maintenance"
          description="Jadwalkan penutupan lapangan untuk perbaikan atau hari libur."
          action={
            <Button variant="primary" onClick={openCreate}>
              Jadwalkan Maintenance
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const meta = kindMeta[m.kind];
            const past = isPast(m.end);
            const ongoing = isOngoing(m.start, m.end);
            return (
              <div
                key={m.id}
                className={[
                  "flex flex-wrap items-center gap-4 rounded-2xl border bg-[var(--surface-card)] p-4 transition-all",
                  past
                    ? "border-[var(--border-default)] opacity-60"
                    : "border-[var(--border-default)] hover:shadow-theme-sm",
                ].join(" ")}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: m.courtColor }}
                >
                  {meta.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--text-heading)]">{m.courtName}</p>
                    <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
                    {ongoing && <ToneBadge tone="error">Berlangsung</ToneBadge>}
                    {past && <ToneBadge tone="neutral">Selesai</ToneBadge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[var(--text-body)]">{m.reason}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-caption)]">
                    {fmtRange(m.start, m.end)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmDelete(m)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                  aria-label="Hapus jadwal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create modal ── */}
      <ModalDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Jadwalkan Maintenance"
        description="Tutup lapangan untuk perbaikan, libur, atau acara privat."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" sheen onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <InputLabel label="Lapangan" tooltip="Lapangan yang akan ditutup." />
            <UiSelect
              searchable
              placeholder="Pilih lapangan…"
              options={courts.map((c) => ({ value: c.id, label: c.name }))}
              value={courtId}
              clearable={false}
              onChange={(v) => setCourtId(v as string)}
            />
            {submitted && !courtValid && (
              <p className="mt-1.5 text-xs text-[var(--color-error,#ef4444)]">Pilih lapangan.</p>
            )}
          </div>

          <div>
            <InputLabel label="Jenis" tooltip="Kategori penutupan lapangan." />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(kindMeta) as MaintenanceKind[]).map((k) => {
                const meta = kindMeta[k];
                const active = k === kind;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-all",
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "border-[var(--border-default)] text-[var(--text-caption)] hover:border-[var(--color-primary)]/40",
                    ].join(" ")}
                  >
                    {meta.icon}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              label="Tanggal"
              mode="single"
              value={date}
              minDate={new Date(`${TODAY_KEY}T00:00:00`)}
              onChange={(v) => {
                if (v instanceof Date) setDate(v);
              }}
            />
            <div>
              <InputLabel label="Durasi" tooltip="Seharian penuh atau rentang jam tertentu." />
              <div className="inline-flex rounded-lg bg-[var(--surface-muted)] p-0.5">
                <button
                  type="button"
                  onClick={() => setAllDay(true)}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    allDay
                      ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-theme-xs"
                      : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
                  ].join(" ")}
                >
                  Seharian
                </button>
                <button
                  type="button"
                  onClick={() => setAllDay(false)}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    !allDay
                      ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-theme-xs"
                      : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
                  ].join(" ")}
                >
                  Rentang jam
                </button>
              </div>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InputLabel label="Dari jam" />
                <TimePicker value={fromTime} minuteStep={30} onChange={(v) => setFromTime(v || "07:00")} />
              </div>
              <div>
                <InputLabel label="Sampai jam" />
                <TimePicker value={toTime} minuteStep={30} onChange={(v) => setToTime(v || "23:00")} />
              </div>
              {submitted && !timeValid && (
                <p className="col-span-2 text-xs text-[var(--color-error,#ef4444)]">
                  Jam selesai harus setelah jam mulai.
                </p>
              )}
            </div>
          )}

          <TextInput
            label="Alasan"
            labelInfo="Keterangan singkat, tampil di daftar maintenance."
            value={reason}
            onChange={setReason}
            placeholder="cth. Ganti net & perbaikan lampu"
            required
            error={submitted && !reasonValid}
            errorText="Alasan minimal 2 karakter"
          />
        </div>
      </ModalDialog>

      {/* ── Delete confirm ── */}
      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus jadwal maintenance?"
        description={confirmDelete ? `${confirmDelete.courtName} · ${confirmDelete.reason}` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              className="!bg-rose-500 hover:!bg-rose-600"
              onClick={doDelete}
            >
              Hapus
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Jadwal akan dihapus (soft delete) dan lapangan kembali bisa dibooking pada rentang waktu tersebut.
        </p>
      </ModalDialog>
    </div>
  );
}
