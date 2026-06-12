"use client";

import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import InputLabel from "./InputLabel";

export type Country = {
  name: string;
  iso2: string;
  dial: string;
};

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface PhoneInputProps {
  countries: Country[];
  value?: string;
  defaultCountry?: string; // iso2
  label?: string;
  labelInfo?: ReactNode;
  labelInfoPlacement?: TooltipPlacement;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  onChange?: (full: string, parts: { dial: string; number: string; iso2: string }) => void;
}

// Gambar bendera dari flagcdn (PNG). Pakai <img> biasa supaya tidak perlu config next/image.
function Flag({ iso2, className = "" }: { iso2: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png 2x`}
      width={20}
      height={14}
      alt={iso2}
      className={`inline-block h-[14px] w-[20px] shrink-0 rounded-[2px] object-cover ${className}`}
    />
  );
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  value,
  defaultCountry = "id",
  label,
  labelInfo,
  labelInfoPlacement,
  required = false,
  hint,
  placeholder = "812 3456 7890",
  disabled = false,
  error = false,
  className = "",
  onChange,
}) => {
  const [iso2, setIso2] = useState(defaultCountry);
  const [number, setNumber] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const country = useMemo(
    () => countries.find((c) => c.iso2 === iso2) ?? countries[0],
    [countries, iso2]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso2.includes(q)
    );
  }, [countries, search]);

  // Sanitasi nomor: hanya digit, hilangkan 0 di depan
  const sanitize = (raw: string) => raw.replace(/[^\d]/g, "").replace(/^0+/, "");

  const emit = (nextNumber: string, nextCountry: Country) => {
    const full = `${nextCountry.dial}${nextNumber}`;
    onChange?.(full, { dial: nextCountry.dial, number: nextNumber, iso2: nextCountry.iso2 });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitize(e.target.value);
    setNumber(clean);
    emit(clean, country);
  };

  const handleCountrySelect = (c: Country) => {
    setIso2(c.iso2);
    setOpen(false);
    setSearch("");
    emit(number, c);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <InputLabel
          label={label}
          required={required}
          tooltip={labelInfo}
          tooltipPlacement={labelInfoPlacement}
        />
      )}
      {/* NOTE: tanpa overflow-hidden agar dropdown tidak terpotong */}
      <div
        className={[
          "flex h-11 items-stretch rounded-lg border bg-transparent shadow-theme-xs transition",
          disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)]" : "",
          error
            ? "border-red-500"
            : open
            ? "border-[var(--color-primary)] ring-3 ring-[rgba(37,99,235,0.12)]"
            : "border-[var(--border-default)]",
        ].join(" ")}
      >
        {/* Country selector */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex h-full shrink-0 items-center gap-1.5 rounded-l-lg border-r border-[var(--border-default)] px-3 text-sm text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          <Flag iso2={country.iso2} />
          <span className="font-medium">{country.dial}</span>
          <svg className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className="h-full min-w-0 flex-1 rounded-r-lg bg-transparent px-3 text-sm text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* Dropdown — di luar container ber-border, posisikan relatif ke wrapper */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] shadow-theme-xl animate-dropdown">
          <div className="border-b border-[var(--border-light)] p-2">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari negara / kode..."
              className="h-9 w-full rounded-lg bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">Tidak ditemukan</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.iso2}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={[
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-muted)]",
                  c.iso2 === iso2 ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "text-[var(--text-body)]",
                ].join(" ")}
              >
                <Flag iso2={c.iso2} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[var(--text-muted)]">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {hint && <p className={`mt-1.5 text-xs ${error ? "text-red-500" : "text-[var(--text-caption)]"}`}>{hint}</p>}
    </div>
  );
};

export default PhoneInput;
