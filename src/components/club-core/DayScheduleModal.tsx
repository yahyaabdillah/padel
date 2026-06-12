"use client";

// PadelHub — per-day slot schedule editor (modal).
// Schedules are stored at 30-min resolution (48 slots/day). The editing grid is
// rendered at the club's chosen booking step (30 or 60 min) — a 60-min cell
// paints both of its underlying half-hour slots together. Only slots WITHIN the
// day's operating window are editable; the rest are greyed-out + locked.

import React, { useEffect, useState } from "react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import {
  type DaySchedule,
  type RateType,
  rateTypeMeta,
  weekdayMeta,
  slotLabel,
  hourToSlot,
  SLOTS_PER_DAY,
  STORAGE_SLOT_MINUTES,
} from "@/data/padel/club/courts";

const RATE_CYCLE: RateType[] = ["regular", "peak", "closed"];

const rateCellCls: Record<RateType, string> = {
  regular:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  peak:
    "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30",
  closed:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

interface DayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** the day being edited (controls title + initial state) */
  schedule: DaySchedule | null;
  /** operating window — hours outside [openStart, openEnd) are locked closed */
  openStart: number;
  openEnd: number;
  /** editing/booking step in minutes (30 or 60) */
  slotMinutes: 30 | 60;
  onSave: (next: DaySchedule) => void;
}

const DayScheduleModal: React.FC<DayScheduleModalProps> = ({
  isOpen,
  onClose,
  schedule,
  openStart,
  openEnd,
  slotMinutes,
  onSave,
}) => {
  const [available, setAvailable] = useState(true);
  // always stored at 30-min resolution (48 slots)
  const [slots, setSlots] = useState<RateType[]>(
    Array.from({ length: SLOTS_PER_DAY }, () => "closed" as RateType),
  );
  const [brush, setBrush] = useState<RateType>("regular");

  // how many 30-min storage slots one editing cell spans (1 for 30-min, 2 for 60-min)
  const span = slotMinutes / STORAGE_SLOT_MINUTES;
  const openStartSlot = hourToSlot(openStart);
  const openEndSlot = hourToSlot(openEnd);

  const inOperating = (slot: number) => slot >= openStartSlot && slot < openEndSlot;
  // a rendered cell is editable only if its FIRST storage slot is operational
  const cellEditable = (startSlot: number) => inOperating(startSlot);

  useEffect(() => {
    if (schedule) {
      setAvailable(schedule.available);
      setSlots(
        schedule.slots.map((r, s) => (inOperating(s) ? r : "closed")),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, isOpen, openStart, openEnd]);

  if (!schedule) return null;

  const dayMeta = weekdayMeta.find((d) => d.value === schedule.day);

  // build the list of rendered cells (start storage-slot of each)
  const cells: number[] = [];
  for (let s = 0; s < SLOTS_PER_DAY; s += span) cells.push(s);

  const paintCell = (startSlot: number, rate: RateType) => {
    if (!cellEditable(startSlot)) return;
    setSlots((prev) =>
      prev.map((r, i) =>
        i >= startSlot && i < startSlot + span && inOperating(i) ? rate : r,
      ),
    );
  };

  const cycleCell = (startSlot: number) => {
    if (!cellEditable(startSlot)) return;
    const current = slots[startSlot];
    const next = RATE_CYCLE[(RATE_CYCLE.indexOf(current) + 1) % RATE_CYCLE.length];
    paintCell(startSlot, next);
  };

  // bulk actions — operate on operational storage slots only
  const fillOperating = (rate: RateType) =>
    setSlots((prev) => prev.map((r, i) => (inOperating(i) ? rate : "closed")));

  const setHourRange = (fromHour: number, toHour: number, rate: RateType) => {
    const fromSlot = hourToSlot(fromHour);
    const toSlot = hourToSlot(toHour);
    setSlots((prev) =>
      prev.map((r, i) => (i >= fromSlot && i < toSlot && inOperating(i) ? rate : r)),
    );
  };

  // counts in HOURS (each storage slot = 30 min)
  const slotHours = STORAGE_SLOT_MINUTES / 60;
  const counts = slots.reduce(
    (acc, r, s) => (inOperating(s) ? { ...acc, [r]: acc[r] + slotHours } : acc),
    { regular: 0, peak: 0, closed: 0 } as Record<RateType, number>,
  );

  const fmtCount = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Atur Jadwal · ${dayMeta?.label ?? ""}`}
      description={`Jam operasional ${slotLabel(openStartSlot)}–${slotLabel(
        openEndSlot,
      )} · step ${slotMinutes} menit. Di luar jam itu otomatis libur. Atur tiap slot: Reguler, Peak, atau Libur.`}
      size="xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="hidden gap-3 text-xs text-[var(--text-caption)] sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{" "}
              {fmtCount(counts.regular)}j reguler
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />{" "}
              {fmtCount(counts.peak)}j peak
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />{" "}
              {fmtCount(counts.closed)}j libur
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="primary"
              sheen
              onClick={() => {
                onSave({ day: schedule.day, available, slots });
                onClose();
              }}
            >
              Simpan Jadwal
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Day availability toggle */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-heading)]">
              Buka di hari {dayMeta?.label}
            </p>
            <p className="text-xs text-[var(--text-caption)]">
              Matikan untuk menutup lapangan sepanjang hari ini.
            </p>
          </div>
          <Switch checked={available} onChange={setAvailable} />
        </div>

        {available && (
          <>
            {/* Brush + bulk helpers */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-caption)]">
                  Kuas:
                </span>
                {RATE_CYCLE.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBrush(r)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      rateCellCls[r],
                      brush === r
                        ? "ring-2 ring-offset-1 ring-[var(--color-primary)] ring-offset-[var(--surface-card)]"
                        : "opacity-80 hover:opacity-100",
                    ].join(" ")}
                  >
                    {rateTypeMeta[r].label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => fillOperating("regular")}>
                  Semua Reguler
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setHourRange(17, 22, "peak")}>
                  Peak 17–22
                </Button>
                <Button variant="ghost" size="sm" onClick={() => fillOperating("closed")}>
                  Kosongkan
                </Button>
              </div>
            </div>
            <p className="text-xs text-[var(--text-caption)]">
              Klik slot untuk mengecat dengan kuas terpilih. Klik kanan untuk
              memutar Reguler → Peak → Libur. Slot di luar operasional dikunci abu-abu.
            </p>

            {/* Slot grid */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {cells.map((startSlot) => {
                const rate = slots[startSlot];
                const label = `${slotLabel(startSlot)}–${slotLabel(startSlot + span)}`;
                const locked = !cellEditable(startSlot);
                if (locked) {
                  return (
                    <div
                      key={startSlot}
                      aria-disabled
                      className="relative flex cursor-not-allowed flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-2 py-2.5 text-xs opacity-60"
                      title={`${label} · di luar jam operasional`}
                    >
                      <span className="text-[13px] font-semibold text-[var(--text-muted)]">
                        {slotLabel(startSlot)}
                      </span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        Tutup
                      </span>
                    </div>
                  );
                }
                return (
                  <button
                    key={startSlot}
                    type="button"
                    onClick={() => paintCell(startSlot, brush)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      cycleCell(startSlot);
                    }}
                    className={[
                      "flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-xs font-medium transition-all hover:scale-[1.03]",
                      rateCellCls[rate],
                    ].join(" ")}
                    title={`${label} · ${rateTypeMeta[rate].label}`}
                  >
                    <span className="text-[13px] font-semibold">{label}</span>
                    <span className="mt-0.5 text-[10px] uppercase tracking-wide opacity-80">
                      {rateTypeMeta[rate].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
};

export default DayScheduleModal;
