"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface TimePickerProps {
  value?: string; // "HH:mm" (24h)
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** format 12 jam dengan AM/PM */
  use12Hours?: boolean;
  /** interval menit untuk pilihan (default 1) */
  minuteStep?: number;
  className?: string;
  onChange?: (value: string) => void;
}

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const pad = (n: number) => String(n).padStart(2, "0");

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  label,
  hint,
  placeholder = "Pilih waktu",
  disabled = false,
  error = false,
  use12Hours = false,
  minuteStep = 1,
  className = "",
  onChange,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // parse value -> hour/minute
  const parsed = useMemo(() => {
    if (!value) return { h: null as number | null, m: null as number | null };
    const [h, m] = value.split(":").map(Number);
    return { h: isNaN(h) ? null : h, m: isNaN(m) ? null : m };
  }, [value]);

  const [hour, setHour] = useState<number | null>(parsed.h);
  const [minute, setMinute] = useState<number | null>(parsed.m);

  useEffect(() => {
    setHour(parsed.h);
    setMinute(parsed.m);
  }, [parsed.h, parsed.m]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const period = hour === null ? "AM" : hour >= 12 ? "PM" : "AM";

  const hours = use12Hours
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);

  const commit = (h: number | null, m: number | null) => {
    if (h === null || m === null) return;
    onChange?.(`${pad(h)}:${pad(m)}`);
  };

  const display = () => {
    if (hour === null || minute === null) return "";
    if (use12Hours) {
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${pad(h12)}:${pad(minute)} ${period}`;
    }
    return `${pad(hour)}:${pad(minute)}`;
  };

  const selectHour = (h: number) => {
    let real = h;
    if (use12Hours) {
      // konversi ke 24h berdasar period saat ini
      if (period === "PM") real = h === 12 ? 12 : h + 12;
      else real = h === 12 ? 0 : h;
    }
    setHour(real);
    commit(real, minute ?? 0);
    if (minute === null) setMinute(0);
  };

  const selectMinute = (m: number) => {
    setMinute(m);
    commit(hour ?? 0, m);
    if (hour === null) setHour(0);
  };

  const togglePeriod = (p: "AM" | "PM") => {
    if (hour === null) return;
    let h = hour % 12;
    if (p === "PM") h += 12;
    setHour(h);
    commit(h, minute ?? 0);
  };

  const colCls = "flex max-h-44 flex-col overflow-y-auto custom-scrollbar px-1";
  const cellCls = (active: boolean) =>
    [
      "shrink-0 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition-colors",
      active ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]" : "text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
    ].join(" ");

  const displayHour = (h: number) => h;

  return (
    <div className={`${open ? "relative z-[60]" : "relative"} ${className}`} ref={ref}>
      {label && <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={[
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-4 text-sm shadow-theme-xs transition",
            disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)]" : "",
            error
              ? "border-red-500"
              : open
              ? "border-[var(--color-primary)] ring-3 ring-[rgba(37,99,235,0.12)]"
              : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
          ].join(" ")}
        >
          <span className={display() ? "text-[var(--text-heading)] tabular-nums" : "text-[var(--text-muted)]"}>
            {display() || placeholder}
          </span>
          <span className="text-[var(--text-muted)]"><ClockIcon /></span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] p-3 shadow-theme-xl">
            <div className="flex gap-2">
              {/* Hours */}
              <div>
                <p className="mb-1 px-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jam</p>
                <div className={colCls}>
                  {hours.map((h) => {
                    const real = use12Hours ? (period === "PM" ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h) : h;
                    return (
                      <button key={h} type="button" onClick={() => selectHour(h)} className={cellCls(hour === real)}>
                        {pad(displayHour(h))}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes */}
              <div className="border-l border-[var(--border-light)] pl-2">
                <p className="mb-1 px-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Menit</p>
                <div className={colCls}>
                  {minutes.map((m) => (
                    <button key={m} type="button" onClick={() => selectMinute(m)} className={cellCls(minute === m)}>
                      {pad(m)}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM */}
              {use12Hours && (
                <div className="border-l border-[var(--border-light)] pl-2">
                  <p className="mb-1 px-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Periode</p>
                  <div className="flex flex-col gap-1">
                    {(["AM", "PM"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => togglePeriod(p)} className={cellCls(period === p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[var(--border-light)] pt-3">
              <button
                type="button"
                onClick={() => { const now = new Date(); setHour(now.getHours()); setMinute(now.getMinutes()); commit(now.getHours(), now.getMinutes()); }}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Sekarang
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)]"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
      {hint && <p className={`mt-1.5 text-xs ${error ? "text-red-500" : "text-[var(--text-caption)]"}`}>{hint}</p>}
    </div>
  );
};

export default TimePicker;
