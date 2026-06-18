"use client";

// Master · Jam Operasional — single source of truth for club open hours per
// weekday. Court schedules lock any hour outside the day's operating window.

import React from "react";
import { Info } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import InputLabel from "@/components/ui/input/InputLabel";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  useOperatingHours,
  type DayOperatingHours,
} from "@/context/OperatingHoursContext";
import { weekdayMeta } from "@/data/padel/club/courts";
import TimeGroupsPanel from "./TimeGroupsPanel";

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
  const { hours, isReady, updateDay, setAll, reset } =
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT/TOP — operating hours */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="divide-y divide-[var(--border-light)]">
              {ordered.map((h) => {
                const meta = weekdayMeta.find((w) => w.value === h.day)!;
                return (
                  <div key={h.day} className="px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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

                    {/* Salin Senin → Hari Kerja — only under the Monday row */}
                    {h.day === 1 && (
                      <div className="mt-3 flex items-center gap-2 pl-[3.25rem]">
                        <Button variant="outline" size="sm" onClick={copyMonToWeekdays}>
                          Salin Senin → Hari Kerja
                        </Button>
                        <Tooltip
                          content="Salin jam buka & tutup Senin ke seluruh hari kerja (Senin–Jumat)."
                          placement="right"
                        >
                          <button
                            type="button"
                            aria-label="Info salin jam Senin"
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.18)]"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="mt-4">
            <p className="text-xs text-[var(--text-caption)]">
              Perubahan jam operasional otomatis tersimpan.
            </p>
          </div>
        </div>

        {/* RIGHT/BOTTOM — time groupings */}
        <div className="lg:col-span-1">
          <TimeGroupsPanel />
        </div>
      </div>
    </div>
  );
}
