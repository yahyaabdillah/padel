"use client";

// PadelHub — per-day schedule editor (modal, table layout).
// The schedule is expressed as time-range ROWS within the day's operating
// window: each row = [jam buka → jam tutup] + a rate (Reguler / Peak).
// Default rate is Reguler. Rows can be added with the dashed "+ Tambah" button.
// On save, rows are rasterized into the 48-slot (30-min) storage array; slots
// not covered by any row (or outside operating hours) become "closed".
// NOTE: day-off ("Libur") is intentionally NOT here — it moves to the
// Maintenance module.

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import UiSelect from "@/components/ui/select/Select";
import {
  type DaySchedule,
  type RateType,
  weekdayMeta,
  slotLabel,
  hourToSlot,
  SLOTS_PER_DAY,
  STORAGE_SLOT_MINUTES,
} from "@/data/padel/club/courts";

/** Only regular/peak are editable rates; "closed" is derived (uncovered slots). */
type RowRate = Exclude<RateType, "closed">;

interface ScheduleRow {
  id: string;
  /** "HH:MM" start */
  from: string;
  /** "HH:MM" end (exclusive) */
  to: string;
  rate: RowRate;
}

interface DayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DaySchedule | null;
  /** operating window — rows must stay within [openStart, openEnd) */
  openStart: number;
  openEnd: number;
  /** editing/booking step in minutes (30 or 60) */
  slotMinutes: 30 | 60;
  onSave: (next: DaySchedule) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const hourStr = (h: number) => `${pad(h)}:00`;

const timeToSlot = (t: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return 0;
  return hourToSlot(Number(m[1])) + (Number(m[2]) >= 30 ? 1 : 0);
};

let rowSeq = 0;
const nextRowId = () => `row-${Date.now().toString(36)}-${rowSeq++}`;

/** Convert a stored 48-slot array into contiguous same-rate rows (within window). */
function slotsToRows(slots: RateType[], openStartSlot: number, openEndSlot: number): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let runStart = -1;
  let runRate: RowRate | null = null;
  const flush = (endSlot: number) => {
    if (runStart >= 0 && runRate) {
      rows.push({
        id: nextRowId(),
        from: slotLabel(runStart),
        to: slotLabel(endSlot),
        rate: runRate,
      });
    }
    runStart = -1;
    runRate = null;
  };
  for (let s = openStartSlot; s < openEndSlot; s++) {
    const r = slots[s];
    if (r === "regular" || r === "peak") {
      if (runRate === r) continue;
      flush(s);
      runStart = s;
      runRate = r;
    } else {
      flush(s);
    }
  }
  flush(openEndSlot);
  return rows;
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
  const openStartSlot = hourToSlot(openStart);
  const openEndSlot = hourToSlot(openEnd);

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!schedule) return;
    const existing = slotsToRows(schedule.slots, openStartSlot, openEndSlot);
    setRows(
      existing.length > 0
        ? existing
        : [{ id: nextRowId(), from: hourStr(openStart), to: hourStr(openEnd), rate: "regular" }],
    );
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, isOpen, openStart, openEnd]);

  if (!schedule) return null;

  const dayMeta = weekdayMeta.find((d) => d.value === schedule.day);

  const updateRow = (id: string, patch: Partial<ScheduleRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setError("");
  };

  const addRow = () => {
    // start the new row where the last one ended (clamped to the window)
    const last = rows[rows.length - 1];
    const from = last?.to ?? hourStr(openStart);
    const fromSlot = timeToSlot(from);
    const toSlot = Math.min(fromSlot + slotMinutes / STORAGE_SLOT_MINUTES, openEndSlot);
    setRows((prev) => [
      ...prev,
      {
        id: nextRowId(),
        from: slotLabel(Math.min(fromSlot, openEndSlot - 1)),
        to: slotLabel(toSlot),
        rate: "regular",
      },
    ]);
  };

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const buildSlots = (): RateType[] | null => {
    const slots: RateType[] = Array.from({ length: SLOTS_PER_DAY }, () => "closed");
    for (const row of rows) {
      const from = timeToSlot(row.from);
      const to = timeToSlot(row.to);
      if (to <= from) {
        setError(`Baris ${row.from}–${row.to}: jam tutup harus setelah jam buka.`);
        return null;
      }
      if (from < openStartSlot || to > openEndSlot) {
        setError(
          `Baris ${row.from}–${row.to}: di luar jam operasional ${hourStr(openStart)}–${hourStr(openEnd)}.`,
        );
        return null;
      }
      for (let s = from; s < to; s++) {
        if (slots[s] !== "closed") {
          setError(`Baris bertabrakan di sekitar ${slotLabel(s)}. Periksa kembali rentang waktu.`);
          return null;
        }
        slots[s] = row.rate;
      }
    }
    return slots;
  };

  const handleSave = () => {
    const slots = buildSlots();
    if (!slots) return;
    onSave({ day: schedule.day, available: true, slots });
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Atur Waktu · ${dayMeta?.label ?? ""}`}
      description={`Jam operasional ${hourStr(openStart)}–${hourStr(openEnd)}. Tentukan rentang waktu dan tarifnya (Reguler / Peak).`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" sheen onClick={handleSave}>
            Simpan Jadwal
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <span>Rentang Waktu</span>
          <span>Tarif</span>
          <span className="w-9" />
        </div>

        {/* Rows */}
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3"
            >
              {/* left: two time pickers */}
              <div className="flex items-center gap-2">
                <TimePicker
                  value={row.from}
                  minuteStep={slotMinutes}
                  className="flex-1"
                  onChange={(v) => updateRow(row.id, { from: v })}
                />
                <span className="text-[var(--text-muted)]">–</span>
                <TimePicker
                  value={row.to}
                  minuteStep={slotMinutes}
                  className="flex-1"
                  onChange={(v) => updateRow(row.id, { to: v })}
                />
              </div>

              {/* right: rate select */}
              <UiSelect
                options={[
                  { value: "regular", label: "Reguler" },
                  { value: "peak", label: "Peak" },
                ]}
                value={row.rate}
                clearable={false}
                onChange={(v) => updateRow(row.id, { rate: v as RowRate })}
              />

              {/* remove */}
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/10"
                aria-label="Hapus baris"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* add row */}
        <Button
          variant="dashed"
          fullWidth
          startIcon={<Plus className="h-4 w-4" />}
          onClick={addRow}
        >
          Tambah
        </Button>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <p className="text-xs text-[var(--text-caption)]">
          Rentang waktu yang tidak tercakup baris mana pun otomatis dianggap tutup.
          Pengaturan hari libur dilakukan di menu Maintenance Lapangan.
        </p>
      </div>
    </ModalDialog>
  );
};

export default DayScheduleModal;
