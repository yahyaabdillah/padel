"use client";

import React, { ReactNode, useMemo, useState } from "react";
import InputLabel from "./InputLabel";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface CurrencyInputProps {
  value?: number;
  defaultValue?: number;
  label?: ReactNode;
  labelInfo?: ReactNode;
  labelInfoPlacement?: TooltipPlacement;
  placeholder?: string;
  hint?: string;
  error?: boolean;
  success?: boolean;
  errorText?: string;
  successText?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  onChange?: (value: number) => void;
}

const formatIDRNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);

const parseIDRNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

export default function CurrencyInput({
  value,
  defaultValue = 0,
  label,
  labelInfo,
  labelInfoPlacement,
  placeholder = "0",
  hint,
  error = false,
  success = false,
  errorText,
  successText,
  disabled = false,
  required = false,
  name,
  id,
  className = "",
  onChange,
}: CurrencyInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;
  const displayValue = useMemo(
    () => (currentValue > 0 ? formatIDRNumber(currentValue) : ""),
    [currentValue]
  );
  const message = error ? errorText : success ? successText : hint;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseIDRNumber(event.target.value);

    if (value === undefined) {
      setInternalValue(next);
    }

    onChange?.(next);
  };

  const stateRing = error
    ? "border-[var(--color-error,#ef4444)] focus:ring-[rgba(239,68,68,0.15)]"
    : success
    ? "border-[var(--color-emerald)] focus:ring-[rgba(16,185,129,0.15)]"
    : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[rgba(37,99,235,0.12)]";

  return (
    <div className={className}>
      {label && (
        <InputLabel
          htmlFor={id}
          label={label}
          required={required}
          tooltip={labelInfo}
          tooltipPlacement={labelInfoPlacement}
        />
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-caption)]">
          Rp
        </span>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          className={[
            "h-11 w-full rounded-lg border bg-transparent py-2.5 pl-10 pr-4 text-sm shadow-theme-xs transition",
            "text-[var(--text-heading)] placeholder:text-[var(--text-muted)]",
            "focus:outline-none focus:ring-3",
            disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)] text-[var(--color-disabled-text)]" : "",
            stateRing,
          ].join(" ")}
        />
      </div>
      {message && (
        <p
          className={[
            "mt-1.5 text-xs",
            error ? "text-[var(--color-error,#ef4444)]" : success ? "text-[var(--color-emerald)]" : "text-[var(--text-caption)]",
          ].join(" ")}
        >
          {message}
        </p>
      )}
    </div>
  );
}
