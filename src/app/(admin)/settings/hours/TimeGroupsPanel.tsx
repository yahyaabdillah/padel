"use client";

// Time-of-day groupings panel (Pagi/Siang/Sore/Malam …). Lives beside the
// operating-hours editor. Each row = a named bucket with a start/end hour,
// validated server-side against the club operating window. Starts with one
// default group; "Tambah grouping" adds more (dashed outline button).

import React, { useCallback, useEffect, useState } from "react";
import { Clock, Trash2, Plus } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import {
  getTimeGroupsAction,
  upsertTimeGroupAction,
  deleteTimeGroupAction,
  type TimeGroup,
} from "./group-actions";

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** A draft row in the editor (id null = not yet persisted). */
type Row = {
  id: string | null;
  name: string;
  startHour: number;
  endHour: number;
  dirty: boolean;
};

const PALETTE = ["#6D5BFF", "#F59E0B", "#14B8A6", "#EC4899", "#0EA5E9"];

const DEFAULT_ROW: Row = { id: null, name: "Reguler", startHour: 8, endHour: 23, dirty: true };

function HourSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-sm text-[var(--text-body)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-40"
    >
      {options.map((h) => (
        <option key={h} value={h}>
          {hourLabel(h)}
        </option>
      ))}
    </select>
  );
}

export default function TimeGroupsPanel() {
  const toast = useToast();
  const { can, isSuper } = useAccess();
  const canCreate = isSuper || can("master.hours", "create");
  const canUpdate = isSuper || can("master.hours", "update");
  const canDelete = isSuper || can("master.hours", "delete");
  const readOnly = !canCreate && !canUpdate;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const groups: TimeGroup[] = await getTimeGroupsAction();
      if (groups.length === 0) {
        setRows([{ ...DEFAULT_ROW }]);
      } else {
        setRows(
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            startHour: g.startHour,
            endHour: g.endHour,
            dirty: false,
          })),
        );
      }
    } catch {
      setRows([{ ...DEFAULT_ROW }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch, dirty: true } : r)),
    );

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: null, name: "", startHour: prev[prev.length - 1]?.endHour ?? 8, endHour: 23, dirty: true },
    ]);

  const saveRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.name.trim()) {
      toast.error("Nama grouping wajib diisi.");
      return;
    }
    setSavingId(row.id ?? "new");
    const res = await upsertTimeGroupAction(row.id, {
      name: row.name,
      startHour: row.startHour,
      endHour: row.endHour,
      sortOrder: idx,
    });
    setSavingId(null);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan grouping.");
      return;
    }
    toast.success(`Grouping "${row.name}" tersimpan.`, "Tersimpan");
    void load();
  };

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.id) {
      // unsaved row — just drop it locally
      setRows((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    const res = await deleteTimeGroupAction(row.id);
    if (!res.success) {
      toast.error(res.error || "Gagal menghapus grouping.");
      return;
    }
    toast.info(`Grouping "${row.name}" dihapus.`);
    void load();
  };

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <Clock className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-[var(--text-heading)]">Grouping Waktu</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Bagi hari jadi sesi (Pagi/Siang/Sore/Malam). Harus dalam jam operasional.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            return (
              <div
                key={row.id ?? `new-${idx}`}
                className="rounded-xl border border-[var(--border-default)] p-3"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-8 w-1.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <div className="flex-1">
                      <TextInput
                        label="Nama"
                        value={row.name}
                        onChange={(v) => patchRow(idx, { name: v })}
                        placeholder="cth. Pagi"
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2 pl-3.5">
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Dari</p>
                      <HourSelect
                        value={row.startHour}
                        onChange={(v) =>
                          patchRow(idx, { startHour: v, endHour: Math.max(row.endHour, v + 1) })
                        }
                        options={Array.from({ length: 24 }, (_, i) => i)}
                        disabled={readOnly}
                      />
                    </div>
                    <span className="mb-2 text-[var(--text-muted)]">–</span>
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Sampai</p>
                      <HourSelect
                        value={row.endHour}
                        onChange={(v) => patchRow(idx, { endHour: v })}
                        options={Array.from({ length: 24 }, (_, i) => i + 1).filter(
                          (i) => i > row.startHour,
                        )}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-caption)]">
                    {row.endHour - row.startHour} jam
                  </span>
                  <div className="flex items-center gap-2">
                    {!readOnly && row.dirty && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={savingId !== null}
                        onClick={() => saveRow(idx)}
                      >
                        {savingId === (row.id ?? "new") ? "Menyimpan…" : "Simpan"}
                      </Button>
                    )}
                    {canDelete && rows.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                        onClick={() => removeRow(idx)}
                        aria-label={`Hapus ${row.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {canCreate && (
            <Button
              variant="dashed"
              fullWidth
              startIcon={<Plus className="h-4 w-4" />}
              onClick={addRow}
            >
              Tambah grouping
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
