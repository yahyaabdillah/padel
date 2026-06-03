"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS_ID,
  MONTHS_ID,
  MONTHS_SHORT_ID,
  formatDate,
  formatMonth,
  getCalendarDays,
  isBetween,
  isSameDay,
  isSameMonth,
  orderRange,
  startOfDay,
} from "./dateUtils";

type DatePickerMode = "single" | "range" | "month" | "time";
type PickerView = "days" | "months" | "years";

export type DateRange = { start: Date | null; end: Date | null };

interface DatePickerProps {
  mode?: DatePickerMode;
  value?: Date | DateRange | string | null;
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  onChange?: (value: Date | DateRange | string | null) => void;
}

const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const navBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-caption)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]";

const YEARS_PER_PAGE = 12;

const DatePicker: React.FC<DatePickerProps> = ({
  mode = "single",
  value,
  label,
  hint,
  placeholder,
  disabled = false,
  error = false,
  minDate,
  maxDate,
  className = "",
  onChange,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Sub-view di dalam kalender: hari → bulan → tahun
  const [view, setView] = useState<PickerView>(mode === "month" ? "months" : "days");

  const [single, setSingle] = useState<Date | null>(value instanceof Date ? value : null);
  const [range, setRange] = useState<DateRange>(
    value && typeof value === "object" && "start" in value ? value : { start: null, end: null }
  );
  const [time, setTime] = useState<string>(typeof value === "string" ? value : "");

  const [viewYear, setViewYear] = useState((single ?? range.start ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState((single ?? range.start ?? new Date()).getMonth());
  // Halaman awal grid tahun
  const [yearPageStart, setYearPageStart] = useState(
    Math.floor((single ?? new Date()).getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // reset sub-view saat dibuka
  useEffect(() => {
    if (open) setView(mode === "month" ? "months" : "days");
  }, [open, mode]);

  const isDisabledDate = (d: Date) => {
    if (minDate && startOfDay(d) < startOfDay(minDate)) return true;
    if (maxDate && startOfDay(d) > startOfDay(maxDate)) return true;
    return false;
  };

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    setViewMonth((m) => (m === 0 ? 11 : m - 1));
    if (viewMonth === 0) setViewYear((y) => y - 1);
  };
  const nextMonth = () => {
    setViewMonth((m) => (m === 11 ? 0 : m + 1));
    if (viewMonth === 11) setViewYear((y) => y + 1);
  };

  const displayValue = () => {
    if (mode === "single") return formatDate(single);
    if (mode === "month") return single ? formatMonth(single) : "";
    if (mode === "time") return time;
    if (mode === "range") {
      const [s2, e2] = orderRange(range.start, range.end);
      if (s2 && e2) return `${formatDate(s2)}  →  ${formatDate(e2)}`;
      if (s2) return `${formatDate(s2)}  →  ...`;
      return "";
    }
    return "";
  };

  const handleDayClick = (d: Date) => {
    if (isDisabledDate(d)) return;
    if (mode === "single") {
      setSingle(d);
      onChange?.(d);
      setOpen(false);
    } else if (mode === "range") {
      if (!range.start || (range.start && range.end)) {
        setRange({ start: d, end: null });
        onChange?.({ start: d, end: null });
      } else {
        const [s2, e2] = orderRange(range.start, d);
        setRange({ start: s2, end: e2 });
        onChange?.({ start: s2, end: e2 });
        setOpen(false);
      }
    }
  };

  // Klik bulan: kalau mode month → langsung pilih; selain itu → ganti viewMonth lalu balik ke grid hari
  const handleMonthPick = (monthIdx: number) => {
    if (mode === "month") {
      const d = new Date(viewYear, monthIdx, 1);
      setSingle(d);
      onChange?.(d);
      setOpen(false);
      return;
    }
    setViewMonth(monthIdx);
    setView("days");
  };

  // Klik tahun: set tahun. Mode month → tetap di pilih bulan. Lainnya → lanjut ke pilih bulan.
  const handleYearPick = (year: number) => {
    setViewYear(year);
    setView("months");
  };

  const handleTimeChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setTime(ev.target.value);
    onChange?.(ev.target.value);
  };

  const [s, e] = orderRange(range.start, range.end);
  const isCalendarMode = mode === "single" || mode === "range";

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
          <span className={displayValue() ? "text-[var(--text-heading)]" : "text-[var(--text-muted)]"}>
            {displayValue() || placeholder || (mode === "time" ? "Pilih waktu" : mode === "month" ? "Pilih bulan" : mode === "range" ? "Pilih rentang tanggal" : "Pilih tanggal")}
          </span>
          <span className="text-[var(--text-muted)]">{mode === "time" ? <ClockIcon /> : <CalendarIcon />}</span>
        </button>

        {/* TIME */}
        {open && mode === "time" && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] p-4 shadow-theme-xl animate-dropdown">
            <input
              type="time"
              value={time}
              onChange={handleTimeChange}
              className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-transparent px-4 text-sm text-[var(--text-heading)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        )}

        {/* MONTH-ONLY MODE */}
        {open && mode === "month" && view === "months" && (
          <div className="absolute z-50 mt-1 w-72 rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] p-3 shadow-theme-xl animate-dropdown">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setViewYear((y) => y - 1)} className={navBtn}>‹</button>
              <button
                type="button"
                onClick={() => { setYearPageStart(Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE); setView("years"); }}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                {viewYear}
              </button>
              <button type="button" onClick={() => setViewYear((y) => y + 1)} className={navBtn}>›</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS_SHORT_ID.map((m, idx) => {
                const active = single && single.getFullYear() === viewYear && single.getMonth() === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthPick(idx)}
                    className={[
                      "rounded-lg py-2 text-sm font-medium transition-colors",
                      active ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]" : "text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CALENDAR MODE (single / range) */}
        {open && isCalendarMode && (
          <div className="absolute z-50 mt-1 w-80 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-popover)] p-3 shadow-theme-xl animate-dropdown">
            {/* ── Header: nav + judul yang bisa diklik ── */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (view === "days") prevMonth();
                  else if (view === "months") setViewYear((y) => y - 1);
                  else setYearPageStart((y) => y - YEARS_PER_PAGE);
                }}
                className={navBtn}
              >
                ‹
              </button>

              {view === "days" && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setView("months")} className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-muted)]">
                    {MONTHS_ID[viewMonth]}
                  </button>
                  <button type="button" onClick={() => { setYearPageStart(Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE); setView("years"); }} className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-muted)]">
                    {viewYear}
                  </button>
                </div>
              )}
              {view === "months" && (
                <button type="button" onClick={() => { setYearPageStart(Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE); setView("years"); }} className="rounded-lg px-3 py-1 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-muted)]">
                  {viewYear}
                </button>
              )}
              {view === "years" && (
                <span className="px-3 py-1 text-sm font-semibold text-[var(--text-heading)]">
                  {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  if (view === "days") nextMonth();
                  else if (view === "months") setViewYear((y) => y + 1);
                  else setYearPageStart((y) => y + YEARS_PER_PAGE);
                }}
                className={navBtn}
              >
                ›
              </button>
            </div>

            {/* ── VIEW: DAYS ── */}
            {view === "days" && (
              <>
                <div className="mb-1 grid grid-cols-7 gap-1">
                  {DAYS_ID.map((d) => (
                    <span key={d} className="flex h-8 items-center justify-center text-[10px] font-semibold text-[var(--text-muted)]">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((d, i) => {
                    const inMonth = isSameMonth(d, new Date(viewYear, viewMonth, 1));
                    const disabledDay = isDisabledDate(d);
                    const isStart = mode === "range" && isSameDay(d, s);
                    const isEnd = mode === "range" && isSameDay(d, e);
                    const inRange = mode === "range" && isBetween(d, s, e);
                    const isSelected = mode === "single" && isSameDay(d, single);
                    const isToday = isSameDay(d, new Date());
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabledDay}
                        onClick={() => handleDayClick(d)}
                        className={[
                          "relative flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                          !inMonth ? "text-[var(--text-muted)] opacity-40" : "text-[var(--text-body)]",
                          disabledDay ? "cursor-not-allowed opacity-30" : "hover:bg-[var(--surface-muted)]",
                          inRange ? "bg-[var(--color-primary-light)] rounded-none" : "",
                          isStart || isEnd || isSelected
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold hover:bg-[var(--color-primary-hover)]"
                            : "",
                          isToday && !isSelected && !isStart && !isEnd ? "ring-1 ring-inset ring-[var(--color-primary)]" : "",
                        ].join(" ")}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── VIEW: MONTHS ── */}
            {view === "months" && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {MONTHS_SHORT_ID.map((m, idx) => {
                  const active = idx === viewMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMonthPick(idx)}
                      className={[
                        "rounded-lg py-3 text-sm font-medium transition-colors",
                        active ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]" : "text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
                      ].join(" ")}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── VIEW: YEARS ── */}
            {view === "years" && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i).map((year) => {
                  const active = year === viewYear;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearPick(year)}
                      className={[
                        "rounded-lg py-3 text-sm font-medium transition-colors",
                        active ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]" : "text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
                      ].join(" ")}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Range footer */}
            {mode === "range" && view === "days" && (
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-light)] pt-3 text-xs text-[var(--text-caption)]">
                <span>{s ? formatDate(s) : "Mulai"} → {e ? formatDate(e) : "Akhir"}</span>
                <button
                  type="button"
                  onClick={() => { setRange({ start: null, end: null }); onChange?.({ start: null, end: null }); }}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {hint && <p className={`mt-1.5 text-xs ${error ? "text-red-500" : "text-[var(--text-caption)]"}`}>{hint}</p>}
    </div>
  );
};

export default DatePicker;
