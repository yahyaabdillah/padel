"use client";

import React, { useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import { useToast } from "@/components/ui/toast/ToastContext";

interface DayHours {
  day: string;
  open: boolean;
  from: string;
  to: string;
  peakFrom: string;
  peakTo: string;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

const initialHours: DayHours[] = [
  { day: "Monday", open: true, from: "07:00", to: "23:00", peakFrom: "18:00", peakTo: "22:00" },
  { day: "Tuesday", open: true, from: "07:00", to: "23:00", peakFrom: "18:00", peakTo: "22:00" },
  { day: "Wednesday", open: true, from: "07:00", to: "23:00", peakFrom: "18:00", peakTo: "22:00" },
  { day: "Thursday", open: true, from: "07:00", to: "23:00", peakFrom: "18:00", peakTo: "22:00" },
  { day: "Friday", open: true, from: "07:00", to: "24:00", peakFrom: "18:00", peakTo: "23:00" },
  { day: "Saturday", open: true, from: "06:00", to: "24:00", peakFrom: "08:00", peakTo: "12:00" },
  { day: "Sunday", open: true, from: "06:00", to: "22:00", peakFrom: "08:00", peakTo: "12:00" },
];

function TimeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-sm text-[var(--text-body)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-40"
    >
      {[...TIME_OPTIONS, "24:00"].map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

export default function HoursPage() {
  const toast = useToast();
  const [hours, setHours] = useState<DayHours[]>(initialHours);
  const [dirty, setDirty] = useState(false);

  const update = (idx: number, patch: Partial<DayHours>) => {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
    setDirty(true);
  };

  const applyWeekdays = () => {
    const mon = hours[0];
    setHours((prev) => prev.map((h, i) => (i < 5 ? { ...h, open: mon.open, from: mon.from, to: mon.to, peakFrom: mon.peakFrom, peakTo: mon.peakTo } : h)));
    setDirty(true);
    toast.info("Monday hours applied to all weekdays.");
  };

  return (
    <PageScaffold
      title="Operating Hours"
      subtitle="Set when the club is open and define peak windows used for dynamic court pricing."
      requireAny={["settings.view"]}
      actions={
        <>
          <Button variant="outline" onClick={applyWeekdays}>Copy Mon → Weekdays</Button>
          <Button variant="primary" sheen disabled={!dirty} onClick={() => { toast.success("Operating hours saved (dummy)."); setDirty(false); }}>
            Save Hours
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Card padding="none">
          <div className="divide-y divide-[var(--border-light)]">
            {hours.map((h, i) => (
              <div key={h.day} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                <div className="flex w-40 items-center gap-3">
                  <Switch checked={h.open} onChange={(v) => update(i, { open: v })} />
                  <span className="font-medium text-[var(--text-heading)]">{h.day}</span>
                </div>

                {h.open ? (
                  <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Hours</span>
                      <TimeSelect value={h.from} onChange={(v) => update(i, { from: v })} />
                      <span className="text-[var(--text-muted)]">–</span>
                      <TimeSelect value={h.to} onChange={(v) => update(i, { to: v })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge size="sm" color="primary" variant="light">Peak</Badge>
                      <TimeSelect value={h.peakFrom} onChange={(v) => update(i, { peakFrom: v })} />
                      <span className="text-[var(--text-muted)]">–</span>
                      <TimeSelect value={h.peakTo} onChange={(v) => update(i, { peakTo: v })} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <Badge color="neutral" variant="light">Closed</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pricing Windows" desc="Peak hours apply higher per-court rates automatically" padding="md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2">
                <Badge color="primary" variant="light" dot>Peak</Badge>
                <span className="text-sm font-medium text-[var(--text-heading)]">Rp350.000 / hour</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-caption)]">Evenings & weekend mornings — highest demand.</p>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2">
                <Badge color="secondary" variant="light" dot>Off-peak</Badge>
                <span className="text-sm font-medium text-[var(--text-heading)]">Rp220.000 / hour</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-caption)]">Daytime weekday slots — discounted to fill courts.</p>
            </div>
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
