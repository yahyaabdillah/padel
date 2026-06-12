"use client";

// Master · Jam Operasional — single source of truth for club open hours per
// weekday. Court schedules lock any hour outside the day's operating window.

import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import InputLabel from "@/components/ui/input/InputLabel";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  useOperatingHours,
  type DayOperatingHours,
} from "@/context/OperatingHoursContext";
import { weekdayMeta } from "@/data/padel/club/courts";

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

function HourSelect({
  value,
  onChange,
  disabled,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  options: number[];
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-sm text-[var(--text-body)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-40"
    >
      {options.map((h) => (
        <option key={h} value={h}>
          {hourLabel(h)}
        </option>
      ))}
    </select>
  );
}

export default function OperatingHoursMasterPage() {
  const toast = useToast();
  const { hours, isReady, updateDay, setAll, reset, slotMinutes, setSlotMinutes } =
    useOperatingHours();

  // ordered Mon → Sun
  const ordered = weekdayMeta
    .map((w) => hours.find((h) => h.day === w.value))
    .filter((h): h is DayOperatingHours => Boolean(h));

  const copyMonToWeekdays = () => {
    const mon = hours.find((h) => h.day === 1);
    if (!mon) return;
    setAll(
      hours.map((h) =>
        h.day >= 1 && h.day <= 5
          ? { ...h, open: mon.open, openStart: mon.openStart, openEnd: mon.openEnd }
          : h,
      ),
    );
    toast.info("Jam Senin disalin ke seluruh hari kerja.");
  };

  if (!isReady) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Master · Jam Operasional" />
        <Card padding="lg">
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Master · Jam Operasional" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-[var(--text-caption)]">
          Atur jam buka klub tiap hari. Jadwal harga tiap lapangan otomatis
          mengunci jam di luar jam operasional ini.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyMonToWeekdays}>
            Salin Senin → Hari Kerja
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              toast.info("Jam operasional dikembalikan ke default.");
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* slot interval */}
      <Card padding="md" className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <InputLabel
              label="Durasi Slot Booking"
              tooltip="Kelipatan waktu booking. 30 menit memungkinkan sewa 1,5 jam; 60 menit hanya kelipatan 1 jam. Jadwal lapangan tetap tersimpan per 30 menit."
            />
          </div>
          <div className="inline-flex rounded-lg bg-[var(--surface-muted)] p-0.5">
            {([30, 60] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSlotMinutes(m);
                  toast.info(`Durasi slot booking diset ${m} menit.`);
                }}
                className={[
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                  slotMinutes === m
                    ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-theme-xs"
                    : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
                ].join(" ")}
              >
                {m} menit
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="divide-y divide-[var(--border-light)]">
          {ordered.map((h) => {
            const meta = weekdayMeta.find((w) => w.value === h.day)!;
            return (
              <div
                key={h.day}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center"
              >
                <div className="flex w-40 items-center gap-3">
                  <Switch
                    checked={h.open}
                    onChange={(v) => updateDay(h.day, { open: v })}
                  />
                  <span className="font-medium text-[var(--text-heading)]">
                    {meta.label}
                  </span>
                </div>

                {h.open ? (
                  <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Jam Buka
                      </span>
                      <HourSelect
                        value={h.openStart}
                        onChange={(v) =>
                          updateDay(h.day, {
                            openStart: v,
                            openEnd: Math.max(h.openEnd, v + 1),
                          })
                        }
                        options={Array.from({ length: 24 }, (_, i) => i).filter(
                          (i) => i < h.openEnd,
                        )}
                      />
                      <span className="text-[var(--text-muted)]">–</span>
                      <HourSelect
                        value={h.openEnd}
                        onChange={(v) => updateDay(h.day, { openEnd: v })}
                        options={Array.from({ length: 24 }, (_, i) => i + 1).filter(
                          (i) => i > h.openStart,
                        )}
                      />
                    </div>
                    <Badge size="sm" color="success" variant="light">
                      {h.openEnd - h.openStart} jam / hari
                    </Badge>
                  </div>
                ) : (
                  <div className="flex-1">
                    <Badge color="neutral" variant="light">
                      Tutup
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4">
        <InputLabel
          label=""
          className="mb-0"
          tooltip="Perubahan otomatis tersimpan."
        />
        <p className="text-xs text-[var(--text-caption)]">
          Perubahan otomatis tersimpan.
        </p>
      </div>
    </div>
  );
}
