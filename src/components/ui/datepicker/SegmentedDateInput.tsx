"use client";

import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import InputLabel from "@/components/ui/input/InputLabel";

type DateSegment = "day" | "month" | "year";
type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface SegmentedDateInputProps {
  value?: Date | null;
  defaultValue?: Date | null;
  label?: ReactNode;
  labelInfo?: ReactNode;
  labelInfoPlacement?: TooltipPlacement;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  minYear?: number;
  maxYear?: number;
  className?: string;
  onChange?: (value: Date | null, formatted: string) => void;
}

const currentYear = new Date().getFullYear();

const pad2 = (value: number) => String(value).padStart(2, "0");

const daysInMonth = (month: number, year: number) => {
  if (month < 1 || month > 12) return 31;
  return new Date(year || currentYear, month, 0).getDate();
};

const formatDate = (date: Date | null) => {
  if (!date) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const parseDateParts = (date: Date | null | undefined) => ({
  day: date ? pad2(date.getDate()) : "",
  month: date ? pad2(date.getMonth() + 1) : "",
  year: date ? String(date.getFullYear()) : "",
});

const digitsOnly = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

const buildDate = (day: string, month: string, year: string) => {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;

  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const maxDay = daysInMonth(monthNumber, yearNumber);

  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > maxDay) return null;

  return new Date(yearNumber, monthNumber - 1, dayNumber);
};

const segmentMeta: Record<DateSegment, { label: string; placeholder: string; maxLength: number }> = {
  day: { label: "Tanggal", placeholder: "dd", maxLength: 2 },
  month: { label: "Bulan", placeholder: "mm", maxLength: 2 },
  year: { label: "Tahun", placeholder: "yyyy", maxLength: 4 },
};

const SegmentedDateInput: React.FC<SegmentedDateInputProps> = ({
  value,
  defaultValue = null,
  label,
  labelInfo,
  labelInfoPlacement,
  hint,
  disabled = false,
  required = false,
  error = false,
  minYear = currentYear - 100,
  maxYear = currentYear + 20,
  className = "",
  onChange,
}) => {
  const initial = parseDateParts(value ?? defaultValue);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [openSegment, setOpenSegment] = useState<DateSegment | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpenSegment(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedDate = buildDate(day, month, year);
  const formatted = formatDate(selectedDate);
  const hasPartialValue = day.length > 0 || month.length > 0 || year.length > 0;
  const hasInvalidCompleteValue = day.length === 2 && month.length === 2 && year.length === 4 && !selectedDate;
  const showError = error || hasInvalidCompleteValue;

  const yearOptions = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index),
    [maxYear, minYear]
  );

  const dayOptions = useMemo(() => {
    const monthNumber = Number(month) || 1;
    const yearNumber = Number(year) || currentYear;
    return Array.from({ length: daysInMonth(monthNumber, yearNumber) }, (_, index) => index + 1);
  }, [month, year]);

  const commitChange = (nextDay: string, nextMonth: string, nextYear: string) => {
    const nextDate = buildDate(nextDay, nextMonth, nextYear);
    onChange?.(nextDate, formatDate(nextDate));
  };

  const updateSegment = (segment: DateSegment, rawValue: string) => {
    const nextValue = digitsOnly(rawValue, segmentMeta[segment].maxLength);
    const nextDay = segment === "day" ? nextValue : day;
    const nextMonth = segment === "month" ? nextValue : month;
    const nextYear = segment === "year" ? nextValue : year;

    if (segment === "day") setDay(nextValue);
    if (segment === "month") setMonth(nextValue);
    if (segment === "year") setYear(nextValue);
    commitChange(nextDay, nextMonth, nextYear);
  };

  const selectSegment = (segment: DateSegment, valueNumber: number) => {
    const nextValue = segment === "year" ? String(valueNumber) : pad2(valueNumber);
    updateSegment(segment, nextValue);
    setOpenSegment(null);
  };

  const options = {
    day: dayOptions,
    month: Array.from({ length: 12 }, (_, index) => index + 1),
    year: yearOptions,
  };

  return (
    <div ref={wrapperRef} className={`relative ${openSegment ? "z-[60]" : ""} ${className}`}>
      {label && (
        <InputLabel
          label={label}
          required={required}
          tooltip={labelInfo}
          tooltipPlacement={labelInfoPlacement}
        />
      )}
      <div
        className={[
          "flex h-11 w-full items-center rounded-lg border bg-transparent shadow-theme-xs transition",
          disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)] opacity-70" : "",
          showError
            ? "border-[var(--color-error,#ef4444)] ring-3 ring-[rgba(239,68,68,0.12)]"
            : openSegment
            ? "border-[var(--color-primary)] ring-3 ring-[rgba(37,99,235,0.12)]"
            : "border-[var(--border-default)] focus-within:border-[var(--color-primary)] focus-within:ring-3 focus-within:ring-[rgba(37,99,235,0.12)]",
        ].join(" ")}
      >
        {(["day", "month", "year"] as DateSegment[]).map((segment, index) => {
          const segmentValue = segment === "day" ? day : segment === "month" ? month : year;
          return (
            <React.Fragment key={segment}>
              {index > 0 && <span className="text-sm font-medium text-[var(--text-muted)]">/</span>}
              <div className="relative flex min-w-0 flex-1 items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={segmentMeta[segment].label}
                  value={segmentValue}
                  placeholder={segmentMeta[segment].placeholder}
                  disabled={disabled}
                  maxLength={segmentMeta[segment].maxLength}
                  onChange={(event) => updateSegment(segment, event.target.value)}
                  onFocus={() => !disabled && setOpenSegment(segment)}
                  className="h-10 min-w-0 flex-1 bg-transparent px-3 text-center text-sm font-medium text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Pilih ${segmentMeta[segment].label.toLowerCase()}`}
                  onClick={() => setOpenSegment((current) => (current === segment ? null : segment))}
                  className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)] disabled:cursor-not-allowed"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openSegment === segment && (
                  <div className="absolute left-1/2 top-full z-50 mt-2 max-h-56 w-28 -translate-x-1/2 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] p-1.5 shadow-theme-xl animate-dropdown">
                    {options[segment].map((option) => {
                      const optionValue = segment === "year" ? String(option) : pad2(option);
                      const active = optionValue === segmentValue;
                      return (
                        <button
                          key={option}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSegment(segment, option)}
                          className={[
                            "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition",
                            active
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                              : "text-[var(--text-body)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]",
                          ].join(" ")}
                        >
                          {optionValue}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {(hint || hasInvalidCompleteValue || formatted) && (
        <p className={`mt-1.5 text-xs ${showError ? "text-[var(--color-error,#ef4444)]" : "text-[var(--text-caption)]"}`}>
          {hasInvalidCompleteValue ? "Tanggal tidak valid" : hint || (hasPartialValue ? formatted : "")}
        </p>
      )}
    </div>
  );
};

export default SegmentedDateInput;
